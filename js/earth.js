const d2r = dec => dec * Math.PI / 180;
const lleuler = (lat, lon) => new THREE.Euler(0, d2r(lon), d2r(lat), 'YZX');
const topoint = (dist, eul) => {
	const b = new THREE.Vector3(dist, 0, 0);
	b.applyEuler(eul);
	return b;
}

// https://astronomy.stackexchange.com/questions/20560/how-to-calculate-the-position-of-the-sun-in-long-lat
function getSunEuler() {
	const Degrees = {
		sin: a => Math.sin(d2r(a)),
		cos: a => Math.cos(d2r(a)),
	};

	const now = Date.now() / 1e3;
	const JD = now / 86400 + 2440587.5;
	// Source: https://en.wikipedia.org/wiki/Position_of_the_Sun
	const n = JD - 2451545;
	const L = (280.460 + 0.9856474 * n) % 360;
	const g = (357.528 + 0.9856003 * n) % 360;
	const lambda = (L + 1.915 * Degrees.sin(g) + 0.020 * Degrees.sin(2 * g)) % 360;
	const R = 1.00014 - 0.01671 * Degrees.cos(g) - 0.00014 * Degrees.cos(2 * g); // Distance
	const epsilon = 23.439 - 0.0000004 * n; // Obliquity of the ecliptic
	const alpha = Math.atan2(Degrees.cos(epsilon) * Degrees.sin(lambda), Degrees.cos(lambda));
	const delta = Math.asin(Degrees.sin(epsilon) * Degrees.sin(lambda)); // declination

	return new THREE.Euler(0, alpha, delta, 'YZX');
}

(function () {

	var webglEl = document.getElementById('webgl');

	const TL = new THREE.TextureLoader;

	if (!Detector.webgl) {
		Detector.addGetWebGLMessage(webglEl);
		return;
	}

	var width  = window.innerWidth,
	    height = window.innerHeight;

	// Earth params
	var radius   = 1,
	    segments = 64,
	    rotation = 0;

	var scene = new THREE.Scene();

	var camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
	camera.position.copy(topoint(3, lleuler(48, 15)));
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(pos => {
			console.log("Geolocation result:", pos);
			camera.position.copy(topoint(3, lleuler(pos.coords.latitude, pos.coords.longitude)));
			controls.update();
		});
	}

	var renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(0x000000, 1.0);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height);

	scene.add(new THREE.AmbientLight(0x333355));

	var light = new THREE.DirectionalLight(0xffffdd, 1);
	light.position.set(0, 0, -30);
	scene.add(light);

   	var sphere = createSphere(radius, segments);
	sphere.rotation.y = rotation;
	scene.add(sphere)

	var clouds = createClouds(radius, segments);
	clouds.rotation.y = rotation;
	scene.add(clouds)

	var stars = createStars(90, 64);
	scene.add(stars);

	var controls = new THREE.TrackballControls(camera);
	controls.rotateSpeed = 0.4;
	controls.noZoom = false;
	controls.noPan = true;
	controls.staticMoving = false;
	controls.minDistance = 1.01;
	controls.maxDistance = 20;

	webglEl.appendChild(renderer.domElement);

	render();

	function render() {
		controls.update();

		const now = new Date;
		const secs = now.getSeconds() + now.getMilliseconds() / 1e3;
		const ang = secs / 60 * 2 * Math.PI * 3;
		light.position = topoint(5, getSunEuler());

		requestAnimationFrame(render);
		renderer.render(scene, camera);
	}

	function createSphere(radius, segments) {
		return new THREE.Mesh(
			new THREE.SphereGeometry(radius, segments, segments),
			new THREE.MeshPhongMaterial({
				map:         TL.load('images/2_no_clouds_4k.jpg'),
				bumpMap:     TL.load('images/elev_bump_4k.jpg'),
				bumpScale:   0.005,
				specularMap: new TL.load('images/water_4k.png'),
				specular:    new THREE.Color('grey')								
			})
		);
	}

	function createClouds(radius, segments) {
		return new THREE.Mesh(
			new THREE.SphereGeometry(radius + 0.003, segments, segments),
			new THREE.MeshPhongMaterial({
				map:         TL.load('images/fair_clouds_4k.png'),
				transparent: true,
			})
		);
	}

	function createStars(radius, segments) {
		return new THREE.Mesh(
			new THREE.SphereGeometry(radius, segments, segments),
			new THREE.MeshBasicMaterial({
				map:  TL.load('images/galaxy_starfield.png'),
				side: THREE.BackSide
			})
		);
	}

}());
