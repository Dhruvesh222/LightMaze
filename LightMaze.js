
var canvas;
var width;
var height;

var game;

var magnification = 1.;
var mouseCenter = [0,0];
var lastMouseCenter = [0,0];
var mouseDragging = false;
var mouseDragged = false;
var trans = [1,0,0,1,0,0];

// var drawCountElement = null;


window.onload = function() {
	canvas = document.getElementById("scratch");
	if ( ! canvas || ! canvas.getContext ) {
		return false;
	}
	var rect = canvas.getBoundingClientRect();
	// IE8 doesn't support Rect.width nor height (nor even canvas)
	width = rect.right - rect.left;
	height = rect.bottom - rect.top;
	game = new LightMazeGame(width, height);

	// var zoomElement = document.getElementById("zoom");
	// var transElement = document.getElementById("trans");
	// var mouseElement = document.getElementById("mouse");
	// drawCountElement = document.getElementById("drawcount");

	// function magnify(f){
	// 	// Prepare the transformation matrix for zooming
	// 	trans = matmp([f, 0, 0, f, (1 - f) * mouseCenter[0], (1 - f) * mouseCenter[1]], trans);

	// 	var result = magnification * f;
	// 	if(result < 1){
	// 		// When fully zoomed out, reset the matrix to identity.
	// 		magnification = 1.;
	// 		trans = [1, 0, 0, 1, 0, 0];
	// 	}
	// 	else
	// 		magnification = result;
	// 	// zoomElement.innerHTML = magnification.toString();
	// 	// transElement.innerHTML = trans.toString();
	// }

	// For Google Chrome
	function MouseWheelListenerFunc(e){
		// magnify(0 < e.wheelDelta ? 1.2 : 1. / 1.2);

		// Cancel scrolling by the mouse wheel
		e.preventDefault();
	}

	// For FireFox
	function MouseScrollFunc(e){
		// magnify(e.detail < 0 ? 1.2 : 1. / 1.2);

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

	function updateSelectedRotation(mouseCenter){
		if(!game.selected)
			return;
		var logicalCoord = matvp(matinv(trans), mouseCenter);

		var newangle = Math.atan2(logicalCoord[1] - game.selected.y, logicalCoord[0] - game.selected.x);
		game.selected.angle = newangle;
	}

	canvas.onmousemove = function (e){

		// For older InternetExplorerS
		if (!e)	e = window.event;

		var r = getOffsetRect(canvas);

		mouseCenter[0] = e.clientX - r.left;
		mouseCenter[1] = e.clientY - r.top;

		if(mouseDragging && (mouseCenter[0] !== lastMouseCenter[0] || mouseCenter[1] !== lastMouseCenter[1])){
			var nextx = trans[4] + mouseCenter[0] - lastMouseCenter[0];
			var nexty = trans[5] + mouseCenter[1] - lastMouseCenter[1];
			if(0 <= -nextx && -nextx < width * (trans[0] - 1))
				trans[4] += mouseCenter[0] - lastMouseCenter[0];
			if(0 <= -nexty && -nexty < height * (trans[3] - 1))
				trans[5] += mouseCenter[1] - lastMouseCenter[1];

			lastMouseCenter[0] = mouseCenter[0];
			lastMouseCenter[1] = mouseCenter[1];

			// If the player moves mouse cursor during mouse button is down, his or
			// her intention is probably not clicking, but dragging around, and
			// this is a way to notify onclick event that it was a drag.
			mouseDragged = true;
		}
		else{
			updateSelectedRotation(mouseCenter);
		}
		e.preventDefault();
	};

	canvas.onmousedown = function(e){
		mouseDragging = true;
		mouseDragged = false;
		// mouseElement.innerHTML = "true";

		var r = getOffsetRect(canvas);

		lastMouseCenter[0] = e.clientX - r.left;
		lastMouseCenter[1] = e.clientY - r.top;
	};

	canvas.onmouseup = function(e){
		mouseDragging = false;
		// mouseElement.innerHTML = "false";
	};

	canvas.onclick = function(e){
		// For older InternetExplorerS
		if (!e)	e = window.event;

		var r = getOffsetRect(canvas);

		mouseCenter[0] = e.clientX - r.left;
		mouseCenter[1] = e.clientY - r.top;

		// It's annoying if dragging is interpreted as a click especially when
		// dragging has another meaning.
		if(mouseDragged)
			return;

		if(game.selected){
			updateSelectedRotation(mouseCenter);
			game.selected = null;
		}
		else{
			var logicalCoord = matvp(matinv(trans), mouseCenter);

			console.log(logicalCoord[0] + "," + logicalCoord[1]);

			for(var i = 0; i < game.instruments.length; i++){
				var inst = game.instruments[i];
				if(vecdist(logicalCoord, [inst.x, inst.y]) < 20){
					game.selected = inst;
				}
			}

			// Debug output to see if matrix inverse is correct
			function mat2str(m){
				var debugstr = "";
				for(var i = 0; i < 6; i++)
					debugstr += m[i] + ",";
				return "[" + debugstr + "]";
			}
			console.log(mat2str(trans) + ", " + mat2str(matinv(trans)) + ", " + mat2str(matmp(trans, matinv(trans))));
		}
	};

	var stageno = document.getElementById('stageno');
	console.log(stageno);

	if(stageno){
		for(var i = 9; i < game.problems.length; i++){
			var cell = document.createElement('span');
			cell.id = "stageno" + (i+1);
			cell.innerHTML = (i+1);
			cell.className = "noselect " + (i === game.currentProblem ? "probcell currentProb" : "probcell");
			cell.onclick = function(){
				nextStage(parseInt(this.innerHTML)-1);
			};
			stageno.appendChild(cell);
		}
	}

	var loop = function() {
		draw();
		var timer = setTimeout(loop,50);
	};

	loop();
};

function nextStage(stageno){
	if(stageno !== undefined)
		game.currentProblem = stageno - 1;
	game.nextProblem();
	var nextStageElem = document.getElementById("nextstage");
	nextStageElem.style.display = "none";
	for(var i = 9; i < game.problems.length; i++){
		var stageNoElem = document.getElementById("stageno" + (i + 1));
		stageNoElem.className = "noselect " + (i === game.currentProblem ? "probcell currentProb" : "probcell");
	}
}

function resetTrans(ctx){
	ctx.setTransform(1,0,0,1,0,0);
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

	game.update(0.1);

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
	for(var i = 0; i < game.instruments.length; i++){
		var v = game.instruments[i];
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
			game.rayTraceMulti(start, angle, function(hitData){
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
			// Mirror has glass-ish color
			ctx.fillStyle = "#005f7f"
			ctx.fillRect(-2,-15,4,30);
		}
		transform();
	}

	transform();
	for(var i = 0; i < game.walls.length; i++){
		var v = game.walls[i];

		totalCounts.wall++;

		ctx.strokeStyle = v.isReflective() ? "#005f7f" : "#000";
		ctx.lineWidth = 3;

		drawCounts.wall++;

		ctx.beginPath();
		ctx.moveTo(v.x0, v.y0);
		ctx.lineTo(v.x1, v.y1);
		ctx.stroke()
	}

	// Draw selection box on top of everything
	if(game.selected){
		transform();
		ctx.translate(game.selected.x, game.selected.y);
		ctx.rotate(game.selected.angle);
		function drawSelectionBox(){
			ctx.strokeRect(-20, -20, 40, 40);
			ctx.beginPath();
			ctx.moveTo(50, 10);
			ctx.lineTo(65, 0);
			ctx.lineTo(50, -10);
			ctx.closePath();
			ctx.stroke();
		}
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 5;
		drawSelectionBox();
		ctx.strokeStyle = "#ffff00";
		ctx.lineWidth = 3;
		drawSelectionBox();
	}

	if(game.stageCleared){
		resetTrans(ctx);
		ctx.font = "bold 40px Arial";
		ctx.fillStyle = "#ff7fff";
		var txt = "STAGE CLEAR!";
		var textMetric = ctx.measureText(txt);
		ctx.fillText(txt, width / 2, height / 2);
	}

	// Reset the transformation for the next drawing
	transform();

	if(game.stageCleared){
		var nextStageElem = document.getElementById("nextstage");
		nextStageElem.style.display = "block";
	}

	var countStr = ""
	for(var i = 0; i < countElements.length; i++)
		countStr += countElements[i] + ": " + drawCounts[countElements[i]] + " / " + totalCounts[countElements[i]] + "<br>"
	// drawCountElement.innerHTML = countStr;
}
