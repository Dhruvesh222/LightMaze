
/// Custom inheritance function that prevents the super class's constructor
/// from being called on inehritance.
/// Also assigns constructor property of the subclass properly.
/// @param subclass The constructor of subclass that should be inherit base
/// @param base The constructor of the base class which subclass's prototype should point to.
/// @param methods Optional argument for a table containing methods to define for subclass.
///                The table is mixed-in to subclass, so it won't be a base class of subclass.
function inherit(subclass,base,methods){
	// If the browser or ECMAScript supports Object.create, use it
	// (but don't remember to redirect constructor pointer to subclass)
	if(Object.create){
		subclass.prototype = Object.create(base.prototype);
	}
	else{
		var sub = function(){};
		sub.prototype = base.prototype;
		subclass.prototype = new sub;
	}
	if(methods)
		mixin(subclass.prototype, methods);
	subclass.prototype.constructor = subclass;
}

/// \brief Calculates parallel and perpendicular unit vectors against difference of given vectors.
/// \param para Buffer for returning vector parallel to difference of pos and dpos and have a unit length
/// \param perp Buffer for returning vector perpendicular to para and have a unit length
/// \param pos Input vector for the starting point
/// \param dpos Input vector for the destination point
/// \returns Distance of the given vectors
function calcPerp(para, perp, pos, dpos){
	perp[0] = pos[1] - dpos[1];
	perp[1] = -(pos[0] - dpos[0]);
	var norm = Math.sqrt(perp[0] * perp[0] + perp[1] * perp[1]);
	perp[0] /= norm;
	perp[1] /= norm;
	if(para !== null){
		para[0] = -(pos[0] - dpos[0]) / norm;
		para[1] = -(pos[1] - dpos[1]) / norm;
	}
	return norm;
}



/// A pseudo-random number generator distributed in Poisson distribution.
/// It uses Knuth's algorithm, which is not optimal when lambda gets
/// so high.  We probably should use an approximation.
function poissonRandom(rng,lambda){
	var L = Math.exp(-lambda);
	var k = 0;
	var p = 1;
	do{
		k++;
		p *= rng.next();
	}while(L < p);
	return k - 1;
}




function Instrument(x,y,angle){
	this.x = x;
	this.y = y;
	this.angle = angle || 0;
}

Instrument.prototype.update = function(){}
Instrument.prototype.preUpdate = function(){}
Instrument.prototype.isReflective = function(){return false}

Instrument.prototype.getPos = function(){
	return [this.x, this.y];
}

function Mirror(x,y,angle){
	Instrument.call(this,x,y,angle);
}
inherit(Mirror, Instrument)

Mirror.prototype.getNormal = function(){
	return [Math.cos(this.angle), Math.sin(this.angle)]
}

Mirror.prototype.isReflective = function(){return true}

function LaserSource(x,y,angle){
	Instrument.call(this,x,y,angle);
}
inherit(LaserSource, Instrument)

LaserSource.prototype.update = function(dt){
	graph.rayTraceMulti([this.x, this.y], this.angle, function(hitData){
		if(hitData.hitobj instanceof LaserSensor){
			// Determine hit if angle between incoming ray and sensor heading is less than 30 degrees.
			if(vecdot([Math.cos(hitData.hitobj.angle), Math.sin(hitData.hitobj.angle)], hitData.dir) < -Math.sqrt(1./2))
				hitData.hitobj.hit = true
		}
	})
}

function MotorLaserSource(x,y,angle){
	LaserSource.call(this,x,y,angle);
}
inherit(MotorLaserSource, LaserSource)

MotorLaserSource.prototype.update = function(dt){
	if(graph.selected !== this)
		this.angle = (this.angle + 0.01 * dt * Math.PI) % (2 * Math.PI)
	LaserSource.prototype.update.call(this,dt)
}

function LaserSensor(x,y,angle){
	Instrument.call(this,x,y,angle);
	this.hit = false
}
inherit(LaserSensor, Instrument)

LaserSensor.prototype.preUpdate = function(){
	this.hit = false
}

// Wall segment
function Wall(x0,y0,x1,y1,reflective){
	this.x0 = x0;
	this.y0 = y0;
	this.x1 = x1;
	this.y1 = y1;
	this.reflective = reflective || false;
}

Wall.prototype.getNormal = function(){
	var length = vecdist([this.x0, this.y0], [this.x1, this.y1])
	return vecscale([this.y1 - this.y0, -(this.x1 - this.x0)], 1 / length)
}

Wall.prototype.isReflective = function(){
	return this.reflective
}

function Graph(width, height){
	this.instruments = [];
	this.walls = [];

	this.problems = [
		function(){
			this.instruments.push(new LaserSource(125,100,Math.PI/6))
			this.instruments.push(new LaserSensor(325,100,-Math.PI/6))
			this.walls.push(new Wall(50,50,400,50));
			this.walls.push(new Wall(400,50,400,250));
			this.walls.push(new Wall(400,250,50,250));
			this.walls.push(new Wall(50,250,50,50));
		},
		function(){
			this.instruments.push(new LaserSource(125,100,Math.PI/6))
			this.instruments.push(new LaserSensor(325,100,-Math.PI/6))

			this.walls.push(new Wall(50,50,200,50));
			this.walls.push(new Wall(200,50,200,250));
			this.walls.push(new Wall(200,250,250,250));
			this.walls.push(new Wall(250,250,250,50));
			this.walls.push(new Wall(250,50,400,50));
			this.walls.push(new Wall(400,50,400,400));
			this.walls.push(new Wall(400,400,50,400, true));
			this.walls.push(new Wall(50,400,50,50));
		},
		function(){
			this.instruments.push(new LaserSource(125,100,Math.PI/6))
			this.instruments.push(new Mirror(225,350,Math.PI/4))
			this.instruments.push(new LaserSensor(325,100,-Math.PI/6))

			this.walls.push(new Wall(50,50,200,50));
			this.walls.push(new Wall(200,50,200,250));
			this.walls.push(new Wall(200,250,250,250));
			this.walls.push(new Wall(250,250,250,50));
			this.walls.push(new Wall(250,50,400,50));
			this.walls.push(new Wall(400,50,400,400));
			this.walls.push(new Wall(400,400,50,400));
			this.walls.push(new Wall(50,400,50,50));
		},
	]

	this.currentProblem = -1;

	// Selected instrument, do not automatically rotate over time
	this.selected = null;

	this.stageCleared = false;

	this.nextProblem();
}

Graph.prototype.global_time = 0;

Graph.prototype.nextProblem = function(){
	if(this.currentProblem+1 < this.problems.length){
		this.instruments.splice(0, this.instruments.length);
		this.walls.splice(0, this.walls.length);
		this.problems[++this.currentProblem].call(this);
		this.stageCleared = false;
		this.selected = null;
	}
}

Graph.prototype.update = function(dt){
	var global_time = Graph.prototype.global_time;

	for(var i = 0; i < this.instruments.length; i++){
		this.instruments[i].preUpdate(dt);
	}

	for(var i = 0; i < this.instruments.length; i++){
		this.instruments[i].update(dt);
	}

	var cleared = true
	for(var i = 0; i < this.instruments.length; i++){
		if(this.instruments[i] instanceof LaserSensor && !this.instruments[i].hit){
			cleared = false
			break
		}
	}

	if(cleared)
		this.stageCleared = true

//	invokes++;
	Graph.prototype.global_time += dt;
}

Graph.prototype.rayTrace = function(x,y,dx,dy){
	var r0 = [x,y]
	var d = [dx,dy]
	var bestt = 1e6
	var endpoint
	var bestn
	var hitobj

	// First pass scans walls
	for(var i = 0; i < this.walls.length; i++){
		var wall = this.walls[i]
		var wall0 = [wall.x0, wall.y0] // Starting point of the wall
		var n = wall.getNormal()
		var rr = vecsub(r0, wall0)
		var dotn = vecdot(rr, n)
		// Almost parallel
		if(Math.abs(dotn) < 1e-3)
			continue
		var t = -dotn / vecdot(d,n)
		if(1e-6 <= t && t < bestt){
			var iendpoint = vecadd(vecscale(d,t), r0)
			var d1 = vecsub([wall.x1, wall.y1], wall0)
			var d1hat = vecnorm(d1)
			var t1 = vecdot(vecsub(iendpoint, wall0), d1hat)
			if(0 <= t1 && t1 < veclen(d1)){
				bestt = t
				endpoint = iendpoint
				bestn = n
				hitobj = wall
			}
		}
	}

	// Now scan the instrument mirrors
	for(var i = 0; i < this.instruments.length; i++){
		var inst = this.instruments[i]
		if(inst instanceof Mirror){
			var n = inst.getNormal()
			var rr = vecsub(r0, [inst.x, inst.y])
			var dotn = vecdot(rr, n)
			// Almost parallel
			if(Math.abs(dotn) < 1e-3)
				continue
			var t = -dotn / vecdot(d,n)
			var iendpoint = vecadd(vecscale(d,t), r0)
			if(1e-6 <= t && t < bestt && vecdist([inst.x, inst.y], iendpoint) < 15){
				bestt = t
				endpoint = iendpoint
				bestn = n
				hitobj = inst
			}
		}
		else if(inst instanceof LaserSensor){
			var rr = vecsub(r0, [inst.x, inst.y])
			var hitCircle = jHitCircle(r0, d, 1000, [inst.x, inst.y], 15)
			if(hitCircle[0] && hitCircle[1] < bestt){
				bestt = hitCircle[1]
				endpoint = vecadd(vecscale(d, hitCircle[1]), r0)
				var nrr = vecscale(rr, 1 / veclen(rr))
				bestn = vecadd(d, vecscale(nrr, -2 * vecdot(d, nrr)))
				hitobj = inst
			}
		}
	}

	return {t: bestt, endpoint: endpoint, n: bestn, hitobj: hitobj, dir: d}
}

/// onReflect is called everytime the ray reflects mirror face
Graph.prototype.rayTraceMulti = function(start,angle,onReflect){
	var reflectCount = 0
	var lastHit
	do{
		var dir = [Math.cos(angle), Math.sin(angle)]
		var hitData = this.rayTrace(start[0], start[1], dir[0], dir[1])
		lastHit = hitData.t < 1e6 && hitData.endpoint
		if(lastHit){
			if(onReflect)
				onReflect(hitData)
			if(!(hitData.hitobj.isReflective()))
				break
			start = hitData.endpoint
			var reflectDir = vecadd(dir, vecscale(hitData.n, -2 * vecdot(dir, hitData.n)))
			angle = Math.atan2(reflectDir[1], reflectDir[0])
		}
	} while(lastHit && reflectCount++ < 3)
	// Call onReflect callback with pseudo-hitData
	if(!lastHit && onReflect)
		onReflect({t: 1000, endpoint: [start[0] + 1000 * Math.cos(angle), start[1] + 1000 * Math.sin(angle)]})
}
