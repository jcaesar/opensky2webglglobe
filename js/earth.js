const d2r = dec => dec * Math.PI / 180;
const lleuler = (lat, lon) => new THREE.Euler(0, d2r(lon), d2r(lat), 'YZX');
const topoint = (dist, eul) => {
	const b = new THREE.Vector3(dist, 0, 0);
	b.applyEuler(eul);
	return b;
}

var now = new Date();

function getSunEuler(date) {
	// Quick hack based on long forgotten school knowledge…
	// Posted it myself… https://astronomy.stackexchange.com/a/31758/26341
	//const now = date || new Date();

	const soy = (new Date(now.getFullYear(), 0, 0)).getTime();
	const eoy = (new Date(now.getFullYear() + 1, 0, 0)).getTime();
	const nows = now.getTime();
	const poy = (nows - soy) / (eoy - soy);

	const secs = now.getUTCMilliseconds() / 1e3
		+ now.getUTCSeconds()
		+ 60 * (now.getUTCMinutes() + 60 * now.getUTCHours());
	const pod = secs / 86400; // leap secs? nah.

	const lat = (-pod + 0.5) * Math.PI * 2;
	const lon = Math.sin((poy - .22) * Math.PI * 2) * .41;

	return new THREE.Euler(0, lat, lon, 'YZX');
}

function flightPathLines() {

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 0.8,
        depthTest: true,
        depthWrite: false,
        linewidth: 0.01
    });

	const points = 6000;

    const line_positions = new Float32Array(points * 3 * 2 );
    const colors = new Float32Array(points * 3 * 2);

    for (var i = 0; i < points; ++i) {
		line_positions[i * 6 + 0] = Math.random();
		line_positions[i * 6 + 1] = Math.random();
		line_positions[i * 6 + 2] = Math.random();
		line_positions[i * 6 + 3] = -1;
		line_positions[i * 6 + 4] = -1;
		line_positions[i * 6 + 5] = -1;

		colors[i * 6 + 0] = 1.0;
		colors[i * 6 + 1] = 0;
		colors[i * 6 + 2] = 0;
		colors[i * 6 + 3] = 0;
		colors[i * 6 + 4] = 0;
		colors[i * 6 + 5] = 1.0;
    }

    geometry.addAttribute('position', new THREE.BufferAttribute(line_positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

	geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3, 2);

    return new THREE.LineSegments(geometry, material);
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

	var flight_path_lines = flightPathLines();
	scene.add(flight_path_lines);

	var controls = new THREE.TrackballControls(camera);
	controls.rotateSpeed = 0.4;
	controls.noZoom = false;
	controls.noPan = true;
	controls.staticMoving = false;
	controls.minDistance = 1.01;
	controls.maxDistance = 20;

	webglEl.appendChild(renderer.domElement);

	render();

	setInterval(() => {
	}, 3000);

	function render() {
		controls.update();

		var positions = flight_path_lines.geometry.attributes.position.array;
		for (let r = 0; r < 1000; r++) {
			const pidx = Math.floor(Math.random() * positions.length / 6);
			const height = Math.random() * 2 - 1;
			const pos = new THREE.Vector3(Math.sqrt(1 - height ** 2), height, 0);
			pos.applyEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0));

			positions[pidx * 6 + 0] = pos.x;
			positions[pidx * 6 + 1] = pos.y;
			positions[pidx * 6 + 2] = pos.z;
			positions[pidx * 6 + 3] = pos.x * 1.05;
			positions[pidx * 6 + 4] = pos.y * 1.05;
			positions[pidx * 6 + 5] = pos.z * 1.05;
		}
		flight_path_lines.geometry.attributes.position.needsUpdate = true;

		const now = new Date;
		const secs = now.getSeconds() + now.getMilliseconds() / 1e3;
		const ang = secs / 60 * 2 * Math.PI * 3;
		light.position.copy(topoint(5, getSunEuler()));

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
