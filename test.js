
require('enable-mobile');
const createSettings = require('settings-panel');
const createWaveform = require('./gl');
const createAudio = require('../app-audio');
const createFps = require('fps-indicator');
const insertCss =  require('insert-styles');
const Color = require('tinycolor2');
const colormap = require('colormap');
const colorScales = require('colormap/colorScales');
let palettes = require('nice-color-palettes/500');
let theme = require('settings-panel/theme/flat')
const tap = require('tap-to-start')
const isMobile = require('is-mobile')()

let colormaps = {};

for (var name in colorScales) {
	if (name === 'alpha') continue;
	if (name === 'hsv') continue;
	if (name === 'rainbow') continue;
	if (name === 'rainbow-soft') continue;
	if (name === 'phase') continue;

	colormaps[name] = colormap({
		colormap: colorScales[name],
		nshades: 16,
		format: 'rgbaString'
	});
	palettes.push(colormaps[name]);
}

palettes = palettes
//filter not readable palettes
.filter((palette) => {
	return Color.isReadable(palette[0], palette.slice(-1)[0], {
		level:"AA", size:"large"
	});
});


insertCss(`
	select option {
		-webkit-appearance: none;
		appearance: none;
		display: block;
		background: white;
		position: absolute;
	}
`);



//show framerate
let fps = createFps();
fps.element.style.color = theme.palette[0];
fps.element.style.fontFamily = theme.fontFamily;
fps.element.style.fontWeight = 500;
fps.element.style.fontSize = '12px';
fps.element.style.marginTop = '1rem';
fps.element.style.marginRight = '1rem';



//hook up waveform
let waveform = createWaveform({
	// worker: false,
	autostart: false,
	// offset: null,
	// offset: 0,
	palette: theme.palette.slice().reverse(),
	scale: 2,
	log: false,
	bufferSize: 44100*5
});






isMobile ? tap({
	background: 'white',
	foreground: '#ddd'
}, init) : init()



function init () {
	// let start = Date.now();
	// let f = 440;
	// let t = 0;
	// let iid = setInterval(() => {
	// 	let data = [];
	// 	for (let i = t; i < t + 1000; i++) {
	// 		data.push(Math.sin(i/10))
	// 	}
	// 	waveform.push(data);
	// 	t += 1000;
	// }, 50);

	// setTimeout(() => {
	// 	clearInterval(iid)
	// }, 1000)



	//create audio source
	let audio = createAudio({
		color: theme.palette[0],
		// autoplay: false,
		// source: 'saw'
		source: isMobile ? 'sine' : 'https://soundcloud.com/vanilla/swept-away'
	}).on('load', (node) => {
		let scriptNode = audio.context.createScriptProcessor(512, 2, 2);

		scriptNode.addEventListener('audioprocess', e => {
			let input = e.inputBuffer.getChannelData(0);

			for (let c = 0; c < e.inputBuffer.numberOfChannels; c++) {
				let input = e.inputBuffer.getChannelData(c);
				let output = e.outputBuffer.getChannelData(c);
				for (let i = 0; i < input.length; i++) {
					output[i] = input[i]
				}
			}
			// e.outputBuffer.copyToChannel(input, 0);
			// e.outputBuffer.copyToChannel(e.inputBuffer.getChannelData(1), 1);
			if (!input[0]) return;

			waveform.push(input);
		});

		node.disconnect();
		node.connect(scriptNode);
		scriptNode.connect(audio.context.destination);
	});

	audio.element.style.fontFamily = theme.fontFamily;
	audio.element.style.fontSize = theme.fontSize;
	audio.update();


	let settings = createSettings([
		{id: 'log', label: 'Log', type: 'checkbox', value: waveform.log, change: v => {
			waveform.update({log: v});
		}},
		// {id: 'grid', label: 'Grid', title: 'Grid', type: 'checkbox', value: true, change: v => {
		// 	waveform.context.clearRect(0,0,waveform.canvas.width, waveform.canvas.height);
		// 	waveform.update({grid: v});
		// }},
		// {id: 'natural', label: 'Natural', title: 'Dye waveform into a natural color depending on frequency contents', type: 'checkbox', value: true, change: v => {
		// }},
		// {id: 'colors', label: 'Colors', type: 'select', value: 'custom', options: (() => {let opts = Object.keys(colormaps); opts.push('custom'); return opts;})(), change: v => {
		// }},
		// {id: 'offset', label: 'Offset', type: 'range', min: -100, max: 100, precision: 0, value: 0, change: v => {waveform.offset = v;}},
		// {id: 'padding', label: 'Padding', type: 'range', min: 0, max: 100, precision: 0, value: 50, change: v => {
		// 	waveform.padding = v;
		// 	waveform.update();
		// }},
		{type: 'raw', label: false, id: 'palette', style: ``, content: function (data) {
			let el = document.createElement('div');
			el.className = 'random-palette';
			el.style.cssText = `
				width: 1.5em;
				height: 1.5em;
				background-color: rgba(120,120,120,.2);
				margin-left: 0em;
				display: inline-block;
				vertical-align: middle;
				cursor: pointer;
				margin-right: 1em;
			`;
			el.title = 'Randomize palette';
			let settings = this.panel;
			setColors(el, settings.theme.palette, settings.theme.active);

			el.onclick = () => {
				// settings.set('colors', 'custom');
				let palette = palettes[Math.floor((palettes.length - 1) * Math.random())];

				setColors(el, palette);
			}

			//create colors in the element
			function setColors(el, palette, active) {
				let bg = palette[palette.length -1];

				settings.update({
					palette: palette,
					style: `background-image: linear-gradient(to top, ${Color(bg).setAlpha(.9).toString()} 0%, ${Color(bg).setAlpha(0).toString()} 100%);`
				});
				waveform.update({
					palette: palette.slice().reverse(),
					background: bg
				});

				audio.update({color: palette[0]});
				fps.element.style.color = waveform.getColor(1);
				audio.element.style.background = `linear-gradient(to bottom, ${Color(bg).setAlpha(.9).toString()} 0%, ${Color(bg).setAlpha(0).toString()} 100%)`;

				el.innerHTML = '';
				if (active) {
					palette = palette.slice();
					palette.unshift(active);
				}
				for (var i = 0; i < 3; i++) {
					let colorEl = document.createElement('div');
					el.appendChild(colorEl);
					colorEl.className = 'random-palette-color';
					colorEl.style.cssText = `
						width: 50%;
						height: 50%;
						float: left;
						background-color: ${palette[i] || 'transparent'}
					`;
				}
			}
			return el;
		}},
		{id: 'decibels', label: 'Range', type: 'interval', min: -100, max: 0, value: [waveform.minDb, waveform.maxDb], change: v => {
			waveform.minDb = v[0];
			waveform.maxDb = v[1];
			waveform.update();
		}, style: `width: 17em;`},
		// {id: 'width', label: 'Width', type: 'range', min: 2, max: 1e7, precision: 0, log: true, value: 44100*4, change: v => {
		// 	waveform.update({width: v});
		// }, style: `width: 12em;`},
		// {id: 'scale', label: 'Scale', type: 'range', min: .1, max: 1e5, precision: 0.01, log: true, value: waveform.scale, change: v => {
		// 	waveform.update({scale: v});
		// }, style: `width: 17em;`},
	], {
		title: '<a href="https://github.com/audio-lab/gl-waveform">gl-waveform</a>',
		theme: theme,
		fontSize: 12,
		css: `
			:host {
				z-index: 1;
				position: fixed;
				bottom: 0;
				right: 0;
				left: 0;
				width: 100%;
				background-color: transparent;
				background-image: linear-gradient(to top, rgba(255,255,255, .9) 0%, rgba(255,255,255,0) 120%);
			}
			.settings-panel-title {
				width: auto;
				display: inline-block;
				line-height: 1;
				margin-right: 3em;
				padding: .5rem 0;
				vertical-align: baseline;
			}
			.settings-panel-field {
				width: auto;
				vertical-align: top;
				display: inline-block;
				margin-right: 1em;
			}
			.settings-panel-label {
				width: auto!important;
			}
		`
	});

}
