
var canvas;
var width;
var height;

var graph;

var magnification = 1.;
var mouseCenter = [0,0];
var lastMouseCenter = [0,0];
var mouseDragging = false;
var trans = [1,0,0,1,0,0];

var drawCountElement = null;


window.onload = function() {
	canvas = document.getElementById("scratch");
	if ( ! canvas || ! canvas.getContext ) {
		return false;
	}
	width = parseInt(canvas.style.width);
	height = parseInt(canvas.style.height);
	graph = new Graph(width, height);

	var zoomElement = document.getElementById("zoom");
	var transElement = document.getElementById("trans");
	var mouseElement = document.getElementById("mouse");
	drawCountElement = document.getElementById("drawcount");

	function magnify(f){
		// Prepare the transformation matrix for zooming
		trans = matmp([f, 0, 0, f, (1 - f) * mouseCenter[0], (1 - f) * mouseCenter[1]], trans);

		var result = magnification * f;
		if(result < 1){
			// When fully zoomed out, reset the matrix to identity.
			magnification = 1.;
			trans = [1, 0, 0, 1, 0, 0];
		}
		else
			magnification = result;
		zoomElement.innerHTML = magnification.toString();
		transElement.innerHTML = trans.toString();
	}

	// For Google Chrome
	function MouseWheelListenerFunc(e){
		magnify(0 < e.wheelDelta ? 1.2 : 1. / 1.2);

		// Cancel scrolling by the mouse wheel
		e.preventDefault();
	}

	// For FireFox
	function MouseScrollFunc(e){
		magnify(e.detail < 0 ? 1.2 : 1. / 1.2);

		// Cancel scrolling by the mouse wheel
		e.preventDefault();
	}

	if(canvas.addEventListener){
		canvas.addEventListener("mousewheel" , MouseWheelListenerFunc);
		canvas.addEventListener("DOMMouseScroll" , MouseScrollFunc);
	}

	// It's tricky to obtain client coordinates of a HTML element.
	function getOffsetRect(elem){
		var box = elem.getBoundingClientRect();
		var body = document.body;
		var docElem = document.documentElement;

		var clientTop = docElem.clientTop || body.clientTop || 0
		var clientLeft = docElem.clientLeft || body.clientLeft || 0

		var top  = box.top - clientTop
		var left = box.left - clientLeft

		return { top: Math.round(top), left: Math.round(left) }
	}

	canvas.onmousemove = function (e){

		// For older InternetExplorerS
		if (!e)	e = window.event;

		var r = getOffsetRect(canvas);

		mouseCenter[0] = e.clientX - r.left;
		mouseCenter[1] = e.clientY - r.top;

		if(mouseDragging){
			var nextx = trans[4] + mouseCenter[0] - lastMouseCenter[0];
			var nexty = trans[5] + mouseCenter[1] - lastMouseCenter[1];
			if(0 <= -nextx && -nextx < width * (trans[0] - 1))
				trans[4] += mouseCenter[0] - lastMouseCenter[0];
			if(0 <= -nexty && -nexty < height * (trans[3] - 1))
				trans[5] += mouseCenter[1] - lastMouseCenter[1];

			lastMouseCenter[0] = mouseCenter[0];
			lastMouseCenter[1] = mouseCenter[1];
		}
		e.preventDefault();
	};

	canvas.onmousedown = function(e){
		mouseDragging = true;
		mouseElement.innerHTML = "true";

		var r = getOffsetRect(canvas);

		lastMouseCenter[0] = e.clientX - r.left;
		lastMouseCenter[1] = e.clientY - r.top;
	};

	canvas.onmouseup = function(e){
		mouseDragging = false;
		mouseElement.innerHTML = "false";
	};

	var loop = function() {
		draw();
		var timer = setTimeout(loop,100);
	};

	loop();
};

function resetTrans(ctx){
	ctx.setTransform(1,0,0,1,200,200);
}

function draw() {
	// A local function to convert a color channel intensity into hexadecimal notation
	function numToHex(d){
		var hex = Math.floor(d * 255).toString(16);

		while(hex.length < 2)
			hex = "0" + hex;

		return hex;
	}

	// A local function to determine road color for showing traffic intensity.
	function roadColor(f){
		return "#" + numToHex((1. + f) / 2.) + "7f7f";
	}

	graph.update(0.1);

	var ctx = canvas.getContext('2d');
	ctx.setTransform(1,0,0,1,0,0);
	ctx.fillStyle = "#7f7f7f";
	ctx.fillRect(0,0,width,height);

	function transform(){
		ctx.setTransform(trans[0], trans[1], trans[2], trans[3], trans[4], trans[5]);
	}

	function hitCheck(pos,radius){
		var x = trans[0] * pos[0] + trans[4];
		var y = trans[3] * pos[1] + trans[5];
		var tr = radius * trans[0]; // Transformed Radius
		return 0 <= x + tr && x - tr < width && 0 <= y + tr && y - tr < height;
	}

	var drawCounts = {}, totalCounts = {};
	var countElements = ["instrument","wall"]
	for(var i = 0; i < 2; i++){
		var counts = [drawCounts, totalCounts][i];
		counts.instrument = counts.wall = 0;
	}

	ctx.font = "bold 16px Helvetica";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// The first pass of GraphEdge traversal draws asphalt-colored, road-like graphics.
	ctx.strokeStyle = "#000";
	transform();
	for(var i = 0; i < graph.instruments.length; i++){
		var v = graph.instruments[i];
		var pos = v.getPos();

		totalCounts.instrument++;

//		if(!hitCheck(vecscale(vecadd(pos, dpos), 0.5), vecdist(pos, dpos) / 2. + vertexRadius))
//				continue;

		drawCounts.instrument++;

		ctx.fillStyle = "#000";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 2;

		ctx.translate(pos[0], pos[1]);
		ctx.rotate(v.angle);
		if(v instanceof LaserSource){
			ctx.fillStyle = "#fff"
			ctx.beginPath()
			ctx.moveTo(-15,-15)
			ctx.lineTo(-15,15)
			ctx.lineTo(5,15)
			ctx.lineTo(5,5)
			ctx.lineTo(15,5)
			ctx.lineTo(15,-5)
			ctx.lineTo(5,-5)
			ctx.lineTo(5,-15)
			ctx.closePath()
			ctx.fill()
			ctx.stroke()

			transform();
			var start = [v.x, v.y]
			var angle = v.angle
			ctx.strokeStyle = "#fff";
			ctx.beginPath()
			ctx.moveTo(v.x, v.y)
			graph.rayTraceMulti(start, angle, function(hitData){
				ctx.lineTo(hitData.endpoint[0], hitData.endpoint[1])
			})
			ctx.stroke()
		}
		else if(v instanceof LaserSensor){
			ctx.fillStyle = v.hit ? "#fff" : "#7f7f3f"
			ctx.beginPath()
			ctx.moveTo(-15,-15)
			ctx.lineTo(-15,15)
			ctx.lineTo(15,15)
			ctx.lineTo(15,Math.sqrt(1./2)*15)
			ctx.lineTo(0,0)
			ctx.lineTo(15,-Math.sqrt(1./2)*15)
			ctx.lineTo(15,-15)
			ctx.closePath()
			ctx.fill()
			ctx.stroke()
		}
		else{
			ctx.fillRect(-2,-15,4,30);
		}
		transform();
	}

	transform();
	for(var i = 0; i < graph.walls.length; i++){
		var v = graph.walls[i];

		totalCounts.wall++;

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 2;

		drawCounts.wall++;

		ctx.beginPath();
		ctx.moveTo(v.x0, v.y0);
		ctx.lineTo(v.x1, v.y1);
		ctx.stroke()

		ctx.lineWidth = 1;

		var n = v.getNormal()
		ctx.beginPath();
		ctx.moveTo(v.x0, v.y0);
		ctx.lineTo(v.x0 + 20 * n[0], v.y0 + 20 * n[1]);
		ctx.stroke()
	}

	// Reset the transformation for the next drawing
	transform();

	var countStr = ""
	for(var i = 0; i < countElements.length; i++)
		countStr += countElements[i] + ": " + drawCounts[countElements[i]] + " / " + totalCounts[countElements[i]] + "<br>"
	drawCountElement.innerHTML = countStr;
}
