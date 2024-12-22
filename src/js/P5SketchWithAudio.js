    import React, { useRef, useEffect } from "react";
    import "./helpers/Globals";
    import "p5/lib/addons/p5.sound";
    import * as p5 from "p5";
    import { Midi } from '@tonejs/midi';
    import Matter from 'matter-js';
    import { createNoise4D } from "simplex-noise";

    import PlayIcon from './functions/PlayIcon.js';
    import audio from "../audio/blobs-no-4.ogg";
    import midi from "../audio/blobs-no-4.mid";

    const P5SketchWithAudio = () => {
        const sketchRef = useRef();

        const Sketch = p => {
            let blobs = new Map();
            let idCount;

            const Engine = Matter.Engine;
            const Runner = Matter.Runner;
            const Bodies = Matter.Bodies;
            const Composite = Matter.Composite;

            const engine = Engine.create({
                gravity: { x: 0, y: 4 }
            });;
            const world = engine.world;
            const runner = Runner.create();

            p.canvas = null;
            p.canvasWidth = window.innerWidth;
            p.canvasHeight = window.innerHeight;
            p.audioLoaded = false;
            p.PPQ = 3840 * 4;

            const simplexNoiseSeed = p.random();
            const noise4D = createNoise4D(() => simplexNoiseSeed);

            const drawBlob = (radius, noiseWeight, amount, t, nxOff, nyOff) => {
                p.strokeWeight(4);
                p.push();
                p.beginShape();
                for (let i = 0; i < (p.TWO_PI / amount) * (amount + 3); i += p.TWO_PI / amount) {
                    const x = p.cos(i) * radius;
                    const y = p.sin(i) * radius;
                    const nx = noise4D(x + nxOff.x, y + nxOff.y, p.cos(t), p.sin(t));
                    const ny = noise4D(x + nyOff.x, y + nyOff.y, p.cos(t), p.sin(t));
                    p.curveVertex(x + nx * noiseWeight, y + ny * noiseWeight);
                }
                p.endShape();
                p.pop();
            }

            const Blob = (x, y, r, color, fill, isLayered) => {
                const body = Bodies.circle(x, y, r, {
                    angle: p.random(p.TWO_PI),
                    restitution: 0.5
                });
                const nxOff = { x: p.random(1000), y: p.random(1000) };
                const nyOff = { x: p.random(1000), y: p.random(1000) };
                Composite.add(world, body);
                
                const drawLayeredBlob = () => {
                    p.push();
                    p.translate(body.position.x, body.position.y);
                    p.rotate(body.angle);
                    
                    p.stroke(color);
                    p.fill(0, 0, 100, 0.88);
                    drawBlob(r * 1.5, 5, 5, p.frameCount * 0.01, nxOff, nyOff);
                    
                    p.stroke(color);
                    p.fill(color);
                    drawBlob(r * 1.2, 5, 5, p.frameCount * 0.01, nxOff, nyOff);
                    
                    p.stroke(0, 0, 100);
                    drawBlob(r * 0.9, 5, 5, p.frameCount * 0.01, nxOff, nyOff);
                    p.pop();
                };

                return {
                    body,
                    show: () => {
                        if (isLayered) {
                            drawLayeredBlob();
                        } else {
                            p.push();
                            p.stroke(color);
                            if (fill) p.fill(color);
                            else p.noFill();
                            p.translate(body.position.x, body.position.y);
                            p.rotate(body.angle);
                            drawBlob(r * 0.75, 5, 5, p.frameCount * 0.01, nxOff, nyOff);
                            p.pop();
                        }
                    },
                    remove: () => Composite.remove(world, body)
                };
            }

            p.loadMidi = () => {
                Midi.fromUrl(midi).then(result => {
                    console.log(result);
                    
                    const noteSet1 = result.tracks[8].notes; //Reactor 6 - Lazerbass - Eraser-Bass
                    p.scheduleCueSet(noteSet1, 'executeCueSet1');
                    const noteSet2 = result.tracks[2].notes; // Combinator - Sparkly Guitar
                    p.scheduleCueSet(noteSet2, 'executeCueSet2');
                    const noteSet3 = result.tracks[1].notes; // Combinator - Sparkly Guitar
                    p.scheduleCueSet(noteSet3, 'executeCueSet3');
                    p.audioLoaded = true;
                    document.getElementById("loader").classList.add("loading--complete");
                    document.getElementById("play-icon").classList.remove("fade-out");
                });
            }

            p.preload = () => {
                p.song = p.loadSound(audio, p.loadMidi);
                p.song.onended(p.logCredits);
            }

            p.scheduleCueSet = (noteSet, callbackName, poly = false) => {
                let lastTicks = -1, currentCue = 1;
                for (let i = 0; i < noteSet.length; i++) {
                    const note = noteSet[i],
                        { ticks, time } = note;
                    if(ticks !== lastTicks || poly){
                        note.currentCue = currentCue;
                        p.song.addCue(time, p[callbackName], note);
                        lastTicks = ticks;
                        currentCue++;
                    }
                }
            }

            const init = () => {
                idCount = 0
                engine.world.bodies = [];
                buildWall(p.width, p.height)
            }

             p.themes = [
                { name: 'Cool Contrast', ranges: [[230, 260], [10, 50], [120, 150]] },
                { name: 'Warm Spectrum', ranges: [[0, 40], [180, 220], [300, 340]] },
                { name: 'Vibrant Mix', ranges: [[60, 90], [240, 270], [330, 360]] },
                { name: 'Ocean Depths', ranges: [[180, 210], [30, 60], [300, 330]] },
                { name: 'Sunset Journey', ranges: [[10, 40], [240, 270], [120, 150]] },
                { name: 'Original Blue', ranges: [[230, 260], [60, 120], [0, 40]] },
                { name: 'Original Green', ranges: [[60, 120], [0, 40], [230, 260]] },
                { name: 'Original Warm', ranges: [[0, 40], [230, 260], [60, 120]] }
            ];

            p.currentTheme = null;

            p.setup = () => {
                p.canvas = p.createCanvas(p.canvasWidth, p.canvasHeight);
                p.colorMode(p.HSB);
                p.currentTheme = Math.random() < 0.4 ? p.themes[6] : p.random(p.themes);
                init()
                Runner.run(runner, engine)
            }

            p.draw = () => {
                p.background(0);
                blobs.forEach((blob) => {
                    p.push();
                    p.fill(255);
                    blob.show();
                    p.pop();
                });

                showWall()
            }

            p.maxCount = 4;

            p.executeCueSet1 = ({currentCue}) => {
                if(currentCue > 1 && currentCue < 162 && currentCue % 18 === 1) {
                    removeWall()
                    setTimeout(() => {
                        blobs = new Map();
                        init()
                        p.maxCount++;
                    }, 500);
                }
                
                const count = p.floor(p.random(3, p.maxCount));
                const hue = p.random(...p.currentTheme.ranges[0]);
                const colour = p.color(hue, p.random(80, 100), p.random(60, 80), p.random(0.6, 0.9));
                addRandomBlobs(count, colour)
            };

            p.executeCueSet2 = () => {
                const count = p.floor(p.random(3, p.maxCount));
                const hue = p.random(...p.currentTheme.ranges[1]);
                const colour = p.color(hue, p.random(70, 90), p.random(60, 80), p.random(0.6, 0.9));
                addRandomBlobs(count, colour)
            }

            p.executeCueSet3 = () => {
                const count = p.floor(p.random(3, p.maxCount));
                const hue = p.random(...p.currentTheme.ranges[2]);
                const colour = p.color(hue, p.random(60, 100), p.random(80, 100), p.random(0.6, 0.9));
                addRandomBlobs(count, colour)
            }

            const addRandomBlobs = (count, color) => {
                for(let i = 0; i < count; i++) {
                    idCount++;
                    const pos = [p.random(p.width), p.random(p.height * 0.1)];
                    const baseSize = p.canvasWidth * 0.03;
                    const nodeNum = p.random([baseSize * 0.4, baseSize * 0.8, baseSize * 1.2]);
                    const isFill = p.random([false, true]);
                    const isLayered = i < 1;
                    blobs.set(idCount, Blob(...pos, nodeNum, color, isFill, isLayered));
                }
            }

            const MAX_THICKNESS = p.canvasWidth * 0.02;
            const walls = {};

            const Wall = (x, y, w, h, dir, opt) => {
                const body = Bodies.rectangle(x, y, w, h, opt);
                let thickness = 0;
                Composite.add(world, body);
                return {
                    body,
                    show: () => {
                        p.push();
                        p.translate(body.position.x, body.position.y);
                        p.rotate(body.angle);
                        p.rectMode(p.CENTER);
                        p.noStroke();
                        if (dir === "hor") p.rect(0, 0, p.min((thickness += 5), w), h);
                        if (dir === "ver") p.rect(0, 0, w, p.min((thickness += 5), h));
                        p.pop();
                    },
                    remove: () => Composite.remove(world, body)
                };
            };

            const buildWall = (w, h) => {
                const opt = { isStatic: true };
                walls.t = Wall(w/2, 0, w, MAX_THICKNESS, "ver", opt);
                walls.b = Wall(w/2, h, w, MAX_THICKNESS, "ver", opt);
                walls.r = Wall(w, h/2, MAX_THICKNESS, h, "hor", opt);
                walls.l = Wall(0, h/2, MAX_THICKNESS, h, "hor", opt);
            };

            const showWall = () => {
                walls.t.show()
                walls.b.show()
                walls.r.show()
                walls.l.show()
            }

            const removeWall = () => {
                walls.t.remove()
                walls.b.remove()
                walls.r.remove()
                walls.l.remove()
            }

            p.mousePressed = () => {
                if(p.audioLoaded){
                    if (p.song.isPlaying()) {
                        p.song.pause();
                    } else {
                        if (parseInt(p.song.currentTime()) >= parseInt(p.song.buffer.duration)) {
                            p.reset();
                        }
                        document.getElementById("play-icon").classList.add("fade-out");
                        p.canvas.addClass("fade-in");
                        p.song.play();
                    }
                }
            }

            p.creditsLogged = false;

            p.logCredits = () => {
                if (!p.creditsLogged && parseInt(p.song.currentTime()) >= parseInt(p.song.buffer.duration)) {
                    p.creditsLogged = true;
                    console.log("Music By: http://labcat.nz/", "\n", "Animation By: https://github.com/LABCAT/");
                    p.song.stop();
                }
            };

            p.reset = () => {
                p.background(0);
            }

            p.updateCanvasDimensions = () => {
                p.canvasWidth = window.innerWidth;
                p.canvasHeight = window.innerHeight;
                p.canvas = p.resizeCanvas(p.canvasWidth, p.canvasHeight);
            }

            if (window.attachEvent) {
                window.attachEvent('onresize', () => p.updateCanvasDimensions());
            }
            else if (window.addEventListener) {
                window.addEventListener('resize', () => p.updateCanvasDimensions(), true);
            }
        };

        useEffect(() => {
            new p5(Sketch, sketchRef.current);
        }, []);

        return (
            <div ref={sketchRef}>
                <PlayIcon />
            </div>
        );
    };

    export default P5SketchWithAudio;