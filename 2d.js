/**
 * @module gl-waveform/2d
 *
 * Lightweight waveform renderer
 */
'use strict';

const Waveform = require('./src/core');
const alpha = require('color-alpha');


module.exports = function (opts) {
	opts = opts || {};
	opts.context = '2d';
	opts.draw = draw;
	opts.redraw = redraw;
	opts.shift = shift;

	let wf = new Waveform(opts);

	let lastLen = 0;

	//shift canvas instead of redrawing the whole set
	wf.on('push', (data, length) => {
		// let shift = (length - lastLen) / wf.scale;
		// if ((wf.offset && wf.offset >= 0) || shift > wf.viewport[2] || (length/wf.scale) < wf.viewport[2]) {
			wf.redraw();
			lastLen = length;
		// }
		// else if (shift > 1) {
		// 	wf.redraw(shift);
		// 	lastLen = length;
		// }
	});

	wf.on('update', opts => {
		wf.redraw();
	});

	wf.on('set', (data, length) => {
		len =
		wf.redraw();
	});

	return wf;
}


function redraw (fromTail) {
	if (this.isDirty) {
		return this;
	}

	this.isDirty = true;

	let offset = this.offset;

	if (offset == null) {
		offset = -this.viewport[2] * this.scale;
	}
	this.storage.get({
		scale: this.scale,
		offset: offset,
		number: this.viewport[2],
		log: this.log
	}, (err, data) => {
		this.emit('redraw', data);
		this.render({tops: data[0], bottoms: data[1] });
	});
}


//shift image in canvas
function shift (offset) {
	let ctx = this.context;
	let [left, top, width, height] = this.viewport;

	let imgData = ctx.getImageData(left, top, width, height);
	ctx.putImageData(imgData, left+offset, top);

	return this;
}


//draw whole part
function draw ({tops, bottoms, tail}) {
	//clean flag
	if (this.isDirty) this.isDirty = false;

	let ctx = this.context;
	let [left, top, width, height] = this.viewport;
	let mid = height*.5;

	if (tail != null) {
		this.shift(-Math.floor(tail));
		left = left + width - tops.length;
	}
	ctx.clearRect(left, top - 1, width + 2, height + 2);

	//draw central line with active color
	ctx.fillStyle = alpha(this.active || this.getColor(.5), .4);
	ctx.fillRect(left, top + mid, width, .5);

	if (!tops || !bottoms || !tops.length || !bottoms.length) return this;

	//create line path
	ctx.beginPath();

	let amp = tops[0];
	ctx.moveTo(left, top + mid - amp*mid);

	//generate gradient
	let style = this.getColor(1);

	//calc spectrumColor(experimental)
	if (this.spectrumColor) {
		style = ctx.createLinearGradient(left, 0, left + tops.length, 0);
		for (let i = 0; i < colors.length; i++) {
			let r = i / colors.length;
			style.addColorStop(r, colors[i]);
		}
	}

	//low scale has 1:1 data
	if (this.scale < 2) {
		for (let x = 0; x < tops.length; x++) {
			amp = tops[x];
			ctx.lineTo(x + left, top + mid - amp*mid);
		}
		ctx.strokeStyle = style;
		ctx.stroke();
	}
	else {
		for (let x = 0; x < tops.length; x++) {
			amp = tops[x];
			ctx.lineTo(x + left, top + mid - amp*mid);
		}
		for (let x = 0; x < bottoms.length; x++) {
			amp = bottoms[bottoms.length - 1 - x];
			ctx.lineTo(left + bottoms.length - 1 - x, top + mid - amp*mid);
		}
		ctx.fillStyle = style;
		ctx.fill();
	}

	ctx.closePath();

	return this;
};
