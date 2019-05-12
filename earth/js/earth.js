const d2r = dec => dec * Math.PI / 180;
const lleuler = (lat, lon) => new THREE.Euler(0, d2r(lon), d2r(lat), 'YZX');
const topoint = (dist, eul) => {
	const b = new THREE.Vector3(dist, 0, 0);
	b.applyEuler(eul);
	return b;
}

function getSunEuler(date) {
	// Quick hack based on long forgotten school knowledge…
	// Posted it myself… https://astronomy.stackexchange.com/a/31758/26341
	const now = date || new Date();

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

// https://stackoverflow.com/a/37184471/401059https://stackoverflow.com/a/37184471/401059
const queryParams = (() => {
	let entries = new URLSearchParams(location.search.slice(1)).entries();
	let result = {}
	for(let entry of entries) { // each 'entry' is a [key, value] tupple
		const [key, value] = entry;
		result[key] = value;
	}
	return result;
})();

const maxPlanes = 10000;
const maxPath = 25;
function flightPathLines() {

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 1,
        depthTest: true,
        depthWrite: false,
        linewidth: 0.1
    });

    const line_positions = new Float32Array(maxPlanes * maxPath * 6);
    const colors = new Float32Array(maxPlanes * maxPath * 6);

    for (var i = 0; i < maxPlanes; ++i) {
		line_positions[i * maxPath * 6 + 0] = -Math.random();
		line_positions[i * maxPath * 6 + 1] = -Math.random();
		for (let j = 2; j < maxPath * 6; ++j)
			line_positions[i * maxPath * 6 + j] = -1;
		for (let j = 0; j < maxPath * 2; ++j) {
			colors[(i * maxPath * 2 + j) * 3 + 0] = 1;
			colors[(i * maxPath * 2 + j) * 3 + 1] = 0;
			colors[(i * maxPath * 2 + j) * 3 + 2] = 0;
		}
		colors[i * maxPath * 6 + 1] = 1;
		colors[i * maxPath * 6 + 2] = 1;
    }

    geometry.addAttribute('position', new THREE.BufferAttribute(line_positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

	geometry.setDrawRange(0, 0);
	geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3, 2);

    return new THREE.LineSegments(geometry, material);
}

var flight_path_lines;

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
	    segments = 64;

	var scene = new THREE.Scene();

	var camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
	camera.position.copy(topoint(3, lleuler(48, 15)));
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(pos => {
			console.log("Geolocation result:", pos);
			camera.position.copy(topoint(3, lleuler(pos.coords.latitude, pos.coords.longitude)));
			controls.update();
			render();
		});
	}

	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(width, height);

	scene.add(new THREE.AmbientLight(0x333355));

	var light = new THREE.DirectionalLight(0xffffdd, 1);
	light.position.set(0, 0, -30);
	scene.add(light);

	var sphere = createSphere(radius, segments);
	scene.add(sphere)

	var clouds = createClouds(radius, segments);
	scene.add(clouds)

	var stars = createStars(90, 64);
	scene.add(stars);

	flight_path_lines = flightPathLines();
	scene.add(flight_path_lines);

	var controls = new THREE.OrbitControls(camera);
	controls.enableKeys = true;
	controls.minDistance = 1.01;
	controls.maxDistance = 20;
	controls.addEventListener('change', render);

	webglEl.appendChild(renderer.domElement);

	render();

	function render() {
		const now = new Date;
		const secs = now.getSeconds() + now.getMilliseconds() / 1e3;
		const ang = secs / 60 * 2 * Math.PI * 3;
		light.position.copy(topoint(15, getSunEuler()));

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

	window.addEventListener('resize', onWindowResize, false);

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		render();
	}

	// Still draw a frame once in a while for sun position updates…
	setInterval(() => {
		if (document.hidden || document.msHidden || document.webkitHidden || document.mozHidden)
			return;
		render();
	}, 3000);

	const Plane = (() => {
		const geometry = flight_path_lines.geometry;
		const positions = geometry.attributes.position.array;
		const lifetime = 300;
		const planes = [];

		return function Plane() {
			let clearTimeout = window.setTimeout(() => this.clear(), lifetime * 1000);
			let pidx = planes.length;
			planes.push(this);
			const shown = pidx < maxPlanes;
			if (shown) {
				geometry.setDrawRange(0, planes.length * maxPath * 2);
			}
			this.hist = [];
			this.update = (data) => {
				const alt = data.altitude || data.geo_altitude;
				if (alt > 30000 || alt <= 0)
					return;
				const height = 1 + alt / 200000; // Actually an exaggeration by a factor of ~30
				this.hist.unshift(topoint(height, lleuler(data.latitude, data.longitude)));
				if (this.hist.length > maxPath + 1)
					this.hist.pop();
				this.draw();
				window.clearTimeout(clearTimeout);
				clearTimeout = setTimeout(() => this.clear(), lifetime * 1000);
			}
			this.draw = () => {
				let i = 1;
				const plpos = pidx * 6 * maxPath;
				if (shown) {
					for (; i < this.hist.length; ++i) {
						positions[plpos + i * 6 - 6] = this.hist[i - 1].x;
						positions[plpos + i * 6 - 5] = this.hist[i - 1].y;
						positions[plpos + i * 6 - 4] = this.hist[i - 1].z;
						positions[plpos + i * 6 - 3] = this.hist[i].x;
						positions[plpos + i * 6 - 2] = this.hist[i].y;
						positions[plpos + i * 6 - 1] = this.hist[i].z;
					}
					for (let j = (i - 1) * 6; j < maxPath * 6; ++j)
							positions[plpos + j] = 1000;
				}
				geometry.attributes.position.needsUpdate = true;
			}
			this.clear = () => {
				this.dead = true;
				planes.pop().assignat(pidx);
				geometry.setDrawRange(0, planes.length * maxPath * 2);
			}
			this.assignat = (otheridx) => {
				if (pidx != planes.length)
					throw Error("Internal error: can't use this plane for overwriting: not last");
				if (!planes[otheridx].dead)
					throw Error("Internal error: overwriting living plane object");
				pidx = otheridx;
				this.draw();
			}
		}
	})();


	const positions = {};
	if (!("test" in queryParams)) {
		const positionSource = new EventSource('./updates/');
		positionSource.onmessage = (e) => {
			const data = JSON.parse(e.data);
			if (data.data.type != "plane_position")
				return;
			if (positions[data.oid] == null)
				positions[data.oid] = new Plane();
			data.data.icao24 = data.oid;
			positions[data.oid].update(data.data);
		}
	} else {
		console.log("Test planees somewhere near england.");
		for (let j = 0; j < 3; j++) {
			const test = new Plane();
			for (let i = 0; i < maxPath; ++i)
				test.update({
					altitude: (i + 1) / maxPath * 15000,
					latitude: 50 + j,
					longitude: i / 3,
				});
		}
		camera.position.copy(topoint(3, lleuler(48, 50)));
	}
}());
