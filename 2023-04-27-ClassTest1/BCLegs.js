/* Birdcage Builder
 *
 * Birdcage Legs
 *
 * Doug Brantner
 * 27 April 2023
 * NYU Langone Health
 * cai2r.net
 *
 * Based on Android implementation of BirdcageBuilder by Giuseppe Carluccio & Christopher Collins.
 */



class BCLegs {

	constructor(n, rc, rs) {
		this.n_legs = Number(n);	// number of legs
		this.r_coil = Number(rc);	// radius of the birdcage TODO - units = meters?
		this.r_shield = Number(rs); // radius of shield TODO units

		this.theta = new Array(n); // angles of legs (radians)

		this.leg_currents = new Array(n);
		this.leg_x = new Array(n);
		this.leg_y = new Array(n);

		this.shield_currents = new Array(n);
		this.shield_x = new Array(n);
		this.shield_y = new Array(n);

		this.init_legs(this.n_legs, this.r_coil); // sets currents & x,y positions
		this.init_shield(this.n_legs, this.r_coil, this.r_shield);

		this.leg_shape = 'null'; // 'rect' or 'tube'
		this.leg_length = -1; 
		this.leg_width = -1;   // for rectangle legs
		this.leg_r_inner = -1; // for tube legs
		this.leg_r_outer = -1; 


		this.leg_self_inductance = -1; // this is set in one of the set_legs_ fn's (geometry specific)
		this.leg_mutual_inductance = -1; 

		// USER MUST CALL:
		// set_legs_<geom>
		// --> this must call set_mutual_inductance


	}

	set_legs_rect(l, w) {
		/* Set up Rectangle shaped legs
		 * set_legs functions are geometry specific.
		 * They MUST also set their own self_inductance
		 * and MUST call set_mutual_inductance() 
		 * as well
		 */
		this.leg_shape = 'rect';
		this.leg_length = Number(l);
		this.leg_width = Number(w);
		this.leg_self_inductance = this.calc_leg_self_inductance_rect(this.leg_length, this.leg_width);
		this.set_mutual_inductance();
	}

	set_legs_tube(l, ir, or) {
		/* see above - Tube shaped legs */
		this.leg_shape_rect = 'tube';
		this.leg_length = Number(l);
		this.leg_r_inner = Number(ir);
		this.leg_r_outer = Number(or);
		this.leg_self_inductance = this.calc_leg_self_inductance_tube(this.leg_length, this.leg_r_inner, this.leg_r_outer);
		this.set_mutual_inductance();
	}

	// NOTE - trying to keep function inputs/outputs as much as possible to make unit testing easier

	init_legs(n, r) {
		/* Initialize leg arrays
		 *		n = number of legs
		 *		r = radius of birdcage coil TODO units
		 *
		 *	This directly modifies the global arrays:
		 *		leg_currents
		 *		leg_x
		 *		leg_y
		 *
		 *	BC2J.67
		 */
	
		var b = (2*Math.PI)/(2*n); // TODO do the 2's cancel out?
	
		for (var k=0; k < n; k++) {


			var a = 2*Math.PI*k/n;

			this.theta[k] = a + b;

			this.leg_currents[k] = Math.cos(this.theta[k]);
			this.leg_x[k] = r * this.leg_currents[k];
			this.leg_y[k] = r * Math.sin(this.theta[k]);

			//this.leg_currents[k] = Math.cos(a + b);
			//this.leg_x[k] = r * this.leg_currents[k];
			//this.leg_y[k] = r * Math.sin(a + b);
	
			//from Birdcage.java (slightly edited) TODO can delete
			//ILeg[k] =     (float)Math.cos(2*Math.PI*k/n + 2*Math.PI/(2*n));
			//Ix[k] = Rcoil*(float)Math.cos(2*Math.PI*k/n + 2*Math.PI/(2*n));
			//Iy[k] = Rcoil*(float)Math.sin(2*Math.PI*k/n + 2*Math.PI/(2*n));

			
		}
	
		debug('BCLegs.init_legs complete');
	}


	init_shield(n, rc, rs) {
		/* Initialize shield image legs
		 *	n = number of legs
		 *	rc = coil radius 
		 *	rs = shield radius
		 *
		 *	Accesses:
		 *	this.leg_currents 
		 *	(These must be initialized up already)
		 *
		 * Directly modifies:
		 *	this.shield_currents = new Array(n);
		 * 	this.shield_x = new Array(n);
		 * 	this.shield_y = new Array(n);
		 *
		 * 	BC2J.104
		 */

		// TODO something seems wrong with the shield positions, possibly due to the ratio?
		// since we're adding to both the X & Y components, should there be some dependence on the angle of the spoke?

		var ratio_image = Math.pow(rs, 2) / rc;

		for (var k=0; k < n; k++) {
			this.shield_currents[k] = -this.leg_currents[k];

			this.shield_x[k] = ratio_image * Math.cos(this.theta[k]);
			this.shield_y[k] = ratio_image * Math.sin(this.theta[k]);

			//var theta = 2*Math.PI*k/n + 2*Math.PI/(2*n); // TODO do 2's cancel in 2nd term?
			//this.shield_x[k] = ratio_image * Math.cos(theta);
			//this.shield_y[k] = ratio_image * Math.sin(theta);
		}

	}


	set_mutual_inductance() {
		/* set this object's mutual inductance & sets correct units on SELF AND Mutual inductance
		 * Assumes legs, shields, and self-inductance are already set
		 *
		 */
		//debug('this.leg_mutual_inductance: ' + this.leg_mutual_inductance); // not set yet
		debug('this.leg_self_inductance: ' + this.leg_self_inductance);
		debug('this.calc_leg_mutual_inductance(this.leg_length): ' + this.calc_leg_mutual_inductance(this.leg_length));
		debug('this.calc_shield_mutual_inductance(this.leg_length): ' + this.calc_shield_mutual_inductance(this.leg_length))


		this.leg_mutual_inductance = this.leg_self_inductance + this.calc_leg_mutual_inductance(this.leg_length) + this.calc_shield_mutual_inductance(this.leg_length);


		// set correct units TODO double check this
		this.leg_self_inductance *= 1e-7;
		this.leg_mutual_inductance *= 1e-7;
	}


	calc_leg_self_inductance_rect(len, width) {
		/* Calculate self-inductance of Rectangular leg
		 *
		 * len = leg length TODO units
		 * width = leg width
		 *
		 * Returns self inductance value TODO units
		 * BC2J.78
		 */
	
		// TODO - java & javascript both seem to use natural log as default - double check this!
		return 2.0 * len * (Math.log(2.0 * len/width) + 0.5);
	}
	
	
	calc_leg_self_inductance_tube(len, r_in, r_out) {
		/* Calculate self-inductance of Tubular leg
		 *
		 * len = leg length TODO units
		 * r_in = inner radius of tube  TODO what does zero mean see below?
		 * r_out = outer radius of tube 
		 *
		 * Returns self inductance value TODO units
		 * BC2J.81
		 */
	
		// TODO - if inner radius is zero, does that mean a solid core conductor/wire?
		// TODO what are these constants in r>0 case? can they be expanded for better precision?
	
		if (r_in > 0) { 
			var ratio = r_in / r_out;
			var c = 0.1493*Math.pow(ratio,3) - 0.3606*Math.pow(ratio,2) - 0.0405*ratio + 0.2526;
			return 2 * len * (Math.log(4*len/r_out) + c - 1);
		}
		else {
			return 2 * len * (Math.log(4*len/r_out) - 0.75);
		}
	
	}

	helper_Lmn(len, d) {
		/* Calculate Lmn subpart for Mutual Inductance of Legs 
		 *
		 *
		 *
		 * BC2J.96 and BC2J.116
		 * */

		var a = (len/d) + Math.sqrt(1 + Math.pow(len/d, 2)); 
		var b = Math.sqrt(1. + Math.pow(d/len, 2));

		//debug('a: ' + a);
		//debug('b: ' + b);

		var Lmn = 2. * len * Math.log(a - b + d/len);

		//debug('Lmn: ' + Lmn);

		//debug('type a: ' + typeof(a));
		//debug('type b: ' + typeof(b));
		//debug('type Lmn: ' + typeof(Lmn));

		return Lmn;
	}


	//calc_leg_mutual_inductance(si, len) {
	calc_leg_mutual_inductance(len) {
		/* Return the mutual inducantce between the legs (does not include shield)
		 *
		 * si = self inductance (scalar) TODO units
		 * len = leg length
		 *
		 *
		 * BC2J.92
		 * */

		// TODO... balance between testable functions w/ explicit and I/O that are arrays...
		// TODO - the arrays are read-only in this case it seems, so they could be input args...

		//var mi = si; // mutual inductance
		var mi = 0; // NOTE original code starts with self inductance, not zero
		var x0 = this.leg_x[0];
		var y0 = this.leg_y[0];
		var d;   // distance between legs
		var Lmn; // helper function value

		for (var k=1; k < this.n_legs; k++) {
			//debug('k: ' + k);
			d = Math.sqrt( Math.pow(this.leg_x[k]-x0, 2) + Math.pow(this.leg_y[k] - y0, 2) );

			Lmn = this.helper_Lmn(len, d);
			//debug('Lmn: ' + Lmn);

			mi += Lmn * this.leg_currents[k] / this.leg_currents[0];
			//debug('mi: ' + mi);
			//debug('');
		}

		return mi;
	}

	calc_shield_mutual_inductance(len) {
		/* Return the shield part of the mutual inductance
		 *
		 * len = leg length
		 *
		 * Accesses:
		 * leg_x, leg_y
		 * shield_x, shield_y
		 *
		 * BCJ.114
		 */

		// TODO DELETE THIS! just testing:
		//if (this.r_shield == 0) return 0;

		var d; // distance from leg 0 to each shield segment
		var Lmn; // helper value
		var mi = 0; // shield portion of mutual inductance

		for (var k = 0; k < this.n_legs; k++) {
			//debug('k: ' + k);


			d = Math.sqrt(Math.pow(this.shield_x[k]-this.leg_x[0], 2) + Math.pow(this.shield_y[k]-this.leg_y[0], 2));
			Lmn = this.helper_Lmn(len, d);
			mi += mi + Lmn * this.shield_currents[k] / this.leg_currents[0];
			// TODO NOTE in above formula in Reverse.doc, the shield current is negative; is this taken care of by negating the leg currents in init_shield?
			//debug('mi: ' + mi);
			//debug('');
		}

		return mi;
	}

}
