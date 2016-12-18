/**
 * @module gl-waveform/gl
 *
 * Webgl waveform renderer
 */

'use strict';

const Waveform = require('./src/core');
const inherit = require('inherits');
const rgba = require('color-rgba');
const attribute = require('gl-util/attribute')
const uniform = require('gl-util/uniform')
const program = require('gl-util/program')
const texture = require('gl-util/texture')

inherit(WaveformGl, Waveform)

module.exports = WaveformGl;

function WaveformGl (opts) {
	if (!(this instanceof Waveform)) return new WaveformGl(opts);

	opts = opts || {};

	Waveform.call(this, opts);

	let gl = this.gl = this.context;

	this.program = program(this.gl, this.vert, this.frag);

	attribute(gl, {
		//max, min, mean, variance sequence
		position: {
			size: 2,
			data: [-1,-1, -1,4, 4,-1]
		}
	}, this.program);

	texture(gl, 'data', {
		height: 1,
		type: gl.FLOAT,
		format: gl.RGBA
	});
	texture(gl, 'colormap', {
		type: gl.UNSIGNED_BYTE,
		format: gl.RGBA,
		filter: gl.LINEAR,
		wrap: gl.CLAMP_TO_EDGE,
		height: this.levels,
		width: 1
	});
}

WaveformGl.prototype.antialias = true;
WaveformGl.prototype.alpha = false;
WaveformGl.prototype.premultipliedAlpha = true;
WaveformGl.prototype.preserveDrawingBuffer = false;
WaveformGl.prototype.depth = false;
WaveformGl.prototype.float = true;
WaveformGl.prototype.levels = 16;


WaveformGl.prototype.update = function (opts) {
	Waveform.prototype.update.call(this, opts);

	this._color = rgba(this.color)
	this._background = rgba(this.background)
	this._infoColor = rgba(this.infoColor)

	if (this.gl) {
		program(this.gl, this.program);
		uniform(this.gl, 'shape', [this.canvas.width, this.canvas.height], this.program);
	}

	if (this.alpha && this.background) this.canvas.style.background = this.background;

	if (this.gl) {
		let colormap = [];
		for (let i = 0; i < this.levels; i++) {
			let channels = rgba(this.getColor((i + .5)/this.levels), false);
			colormap.push(channels[0])
			colormap.push(channels[1])
			colormap.push(channels[2])
			colormap.push(channels[3]*255)
		}
		texture(this.gl, 'colormap', colormap);
	}
}

Waveform.prototype.render = function () {
	this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	if (!this.alpha) {
		let bg = this._background;
		this.gl.clearColor(...bg);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}
	this.emit('render')
	this.draw()

	return this;
}


WaveformGl.prototype.draw = function (data) {
	let gl = this.gl;

	let {width} = this.canvas;
	program(this.gl, this.program);

	if (!data) data = this.data;
	if (!data) return this;

	let tops = data.max, bottoms = data.min, avgs = data.average;

	if (!avgs.length) return this;

	let intensities = Array(avgs.length*4).fill(1);
	for (let i = 0; i < avgs.length; i++) {
		let v = avgs[i] * .5 + .5;
		intensities[i*4] = v;
	}

	texture(this.gl, 'data', {
		height: 1,
		width: avgs.length,
		data: intensities
	}, this.program);
	gl.drawArrays(gl.TRIANGLES, 0, 3);

	/*
	//draw info line
	attribute(this.gl, 'data', [0,0,1,0], this.program);
	uniform(this.gl, 'color', this._infoColor, this.program);
	gl.drawArrays(gl.LINES, 0, 2);


	//draw waveform
	if (!data) data = this.data;
	if (!data) return this;

	let tops = data.max, bottoms = data.min, avgs = data.average;

	if (!tops || !tops.length) return this;

	uniform(this.gl, 'color', this._color, this.program);

	//draw average line
	let position = Array(width*4);
	for (let i = 0, j=0; i < width; i++, j+=2) {
		position[j] = i/width;
		position[j+1] = avgs[i];
	}
	attribute(this.gl, 'data', position, this.program);
	gl.drawArrays(gl.LINE_STRIP, 0, width);

	//fill min/max shape
	for (let i = 0, j=0; i < width; i++, j+=4) {
		let x = i/width;
		position[j] = x;
		position[j+1] = tops[i];
		position[j+2] = x;
		position[j+3] = bottoms[i];
	}

	attribute(this.gl, 'data', position, this.program);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, width*2);
	*/
	return this;
}


Waveform.prototype.vert = `
precision highp float;

attribute vec2 position;

void main () {
	gl_Position = vec4(position, 0, 1);
}
`;
Waveform.prototype.frag = `
precision highp float;

uniform sampler2D data;
uniform sampler2D colormap;
uniform vec2 shape;

void main () {
	vec2 coord = gl_FragCoord.xy / shape;
	vec4 intensity = texture2D(data, vec2(coord.x,.5));
	vec4 color = texture2D(colormap, vec2(.5, intensity.x));
	color.xyz *= pow(1. - abs(.5 - coord.y) * 2., 1.5);
	gl_FragColor = color;
	// gl_FragColor = vec4(vec3(intensity.x), 1);
}
`;




// Waveform.prototype.vert = `
// precision highp float;

// attribute vec2 data;

// void main () {
// 	gl_Position = vec4(data.x*2.-1., data.y, 0, 1);
// }
// `;

// Waveform.prototype.frag = `
// precision highp float;

// uniform vec4 color;
// uniform vec2 shape;

// void main () {
// 	gl_FragColor = color;
// }
// `;
