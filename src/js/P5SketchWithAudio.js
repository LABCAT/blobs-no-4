import React, { useRef, useEffect } from "react";
import "./helpers/Globals";
import "p5/lib/addons/p5.sound";
import * as p5 from "p5";
import { Midi } from '@tonejs/midi'
import PlayIcon from './functions/PlayIcon.js';
import AnimatedBlob from './classes/AnimatedBlob.js';

import blobshape from "blobshape";
import { TriadicColourCalculator } from './functions/ColourCalculators';

import audio from "../audio/blobs-no-3.ogg";
import midi from "../audio/blobs-no-3.mid";

/**
 * Blobs No. 3
 */
const P5SketchWithAudio = () => {
    const sketchRef = useRef();

    const Sketch = p => {

        p.canvas = null;

        p.canvasWidth = window.innerWidth;

        p.canvasHeight = window.innerHeight;

        p.audioLoaded = false;

        p.player = null;

        p.PPQ = 3840 * 4;

        p.loadMidi = () => {
            Midi.fromUrl(midi).then(
                function(result) {
                    console.log(result);
                    const noteSet1 = result.tracks[19].notes; // Wave Layers Edition - Mallet Bass
                    p.scheduleCueSet(noteSet1, 'executeCueSet1');
                    const noteSet2 = result.tracks[21].notes; 
                    p.scheduleCueSet(noteSet2, 'executeCueSet2'); // Europa - Blower Bass
                    p.audioLoaded = true;
                    document.getElementById("loader").classList.add("loading--complete");
                    document.getElementById("play-icon").classList.remove("fade-out");
                }
            );
            
        }

        p.preload = () => {
            p.song = p.loadSound(audio, p.loadMidi);
            p.song.onended(p.logCredits);
        }

        p.scheduleCueSet = (noteSet, callbackName, poly = false)  => {
            let lastTicks = -1,
                currentCue = 1;
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

        p.animatedBlobs = [];

        p.blobsArray = [];

        p.setup = () => {
            p.canvas = p.createCanvas(p.canvasWidth, p.canvasHeight);
            p.colorMode(p.HSB);
            p.background(0, 0, 0);
        }

        p.draw = () => {
            if(p.audioLoaded && p.song.isPlaying()){
                p.background(0, 0, 0);
                p.strokeWeight(4);

                for (let i = 0; i < p.animatedBlobs.length; i++) {
                    const blob = p.animatedBlobs[i];
                    blob.draw();
                    blob.update();
                }

                p.strokeWeight(2);

                for (let i = 0; i < p.blobsArray.length; i++) {
                    const blob = p.blobsArray[i];
                    const { x, y, growth, edges, colourSet, divisor, seed, whiteStroke } = blob;

                    p.drawBlob(x, y, (p.width / (divisor * 0.9)), growth, edges, colourSet[0], seed, whiteStroke);
                    p.drawBlob(x, y, (p.width / (divisor * 1.2)), growth, edges, colourSet[1], seed, false);
                    p.drawBlob(x, y, (p.width / (divisor * 1.5)), growth, edges, colourSet[2], seed, whiteStroke);
                }
            }
        }

        p.drawBlob = (x, y, size, growth, edges, color, seed, whiteStroke) => {
            const { path } = blobshape({ size: size, growth: growth, edges: edges, seed: seed });
            const pathArray = p.parseSVGPath(path);
            p.translate(x - (size / 2), y - (size / 2));
            p.fill(
                color._getHue(),
                100,
                100,
                0.5
            );
            p.stroke(
                color._getHue(),
                whiteStroke ? 0 : 100,
                100,
                1
            );
            p.beginShape();
            for (let cmd of pathArray) {
                let command = cmd[0];
                let params = cmd.slice(1);
                
                if (command === 'M') {
                    p.vertex(params[0], params[1]);
                } else if (command === 'Q') {
                    p.quadraticVertex(params[0], params[1], params[2], params[3]);
                }
            }
            p.endShape(p.CLOSE);
            p.translate(-x + (size / 2), -y + (size / 2));
        }

        p.parseSVGPath = (pathData) => {
            let commands = pathData.match(/[a-df-z][^a-df-z]*/gi);
            let pathArray = [];
            
            for (let cmd of commands) {
                let command = cmd.charAt(0);
                let params = cmd.slice(1).split(/[\s,]+/).map(Number);
                pathArray.push([command, ...params]);
            }
            
            return pathArray;
        }

        p.sizes = [8, 12, 16, 24, 32];
        p.maxEdges = 16;

        p.executeCueSet1 = ({currentCue}) => {
            if(currentCue === 37){
                p.blobsArray = [];
                p.sizes = [8, 12, 16];
                p.maxEdges = 32;
            }
            let tries = 0;
            const maxTries = 100;  // Limit the number of attempts to avoid infinite loops

            let isOverlapping = true;
            while (isOverlapping && tries < maxTries) {
                const divisor = p.random(p.sizes);
                const hue = p.random(0, 360);
                const newCircle = {
                    x: p.random(0, p.width),
                    y: p.random(0, p.height),
                    radius: p.width / (divisor * 0.9) / 2,
                    growth: parseInt(p.random(3, 9)),
                    edges: parseInt(p.random(8, p.maxEdges)),
                    colourSet: TriadicColourCalculator(p, hue),
                    divisor: divisor,
                    seed: p.random(1, 10),
                    whiteStroke: [9, 10, 11, 0].includes(currentCue % 12)
                };

                isOverlapping = false;

                // Check against all existing circles for overlap
                for (let i = 0; i < p.blobsArray.length; i++) {
                    const existingCircle = p.blobsArray[i];
                    const dist = p.dist(newCircle.x, newCircle.y, existingCircle.x, existingCircle.y);
                    if (dist < newCircle.radius + existingCircle.radius) {
                        isOverlapping = true;
                        break;
                    }
                }

                tries++;
                // If no overlap, add it to the array
                if (!isOverlapping) {
                    p.blobsArray.push(newCircle);
                }
            }

            // Optionally handle case where maxTries was reached without success
            if (tries >= maxTries) {
                console.log("Max attempts reached. Could not place the circle without overlap.");
            }
        };

        p.executeCueSet2 = ({currentCue}) => {
            if(currentCue % 12 === 1) {
                p.animatedBlobs = [];
            }
            const x = p.random(0, p.width);
            const y = p.random(0, p.height);
            p.animatedBlobs.push(
                new AnimatedBlob(p, x, y)
            );
        }


        p.hasStarted = false;

        p.mousePressed = () => {
            if(p.audioLoaded){
                if (p.song.isPlaying()) {
                    p.song.pause();
                } else {
                    if (parseInt(p.song.currentTime()) >= parseInt(p.song.buffer.duration)) {
                        p.reset();
                        if (typeof window.dataLayer !== typeof undefined){
                            window.dataLayer.push(
                                { 
                                    'event': 'play-animation',
                                    'animation': {
                                        'title': document.title,
                                        'location': window.location.href,
                                        'action': 'replaying'
                                    }
                                }
                            );
                        }
                    }
                    document.getElementById("play-icon").classList.add("fade-out");
                    p.canvas.addClass("fade-in");
                    p.song.play();
                    if (typeof window.dataLayer !== typeof undefined && !p.hasStarted){
                        window.dataLayer.push(
                            { 
                                'event': 'play-animation',
                                'animation': {
                                    'title': document.title,
                                    'location': window.location.href,
                                    'action': 'start playing'
                                }
                            }
                        );
                        p.hasStarted = false
                    }
                }
            }
        }

        p.creditsLogged = false;

        p.logCredits = () => {
            if (
                !p.creditsLogged &&
                parseInt(p.song.currentTime()) >= parseInt(p.song.buffer.duration)
            ) {
                p.creditsLogged = true;
                    console.log(
                    "Music By: http://labcat.nz/",
                    "\n",
                    "Animation By: https://github.com/LABCAT/"
                );
                p.song.stop();
            }
        };

        p.reset = () => {

        }

        p.updateCanvasDimensions = () => {
            p.canvasWidth = window.innerWidth;
            p.canvasHeight = window.innerHeight;
            p.canvas = p.resizeCanvas(p.canvasWidth, p.canvasHeight);
        }

        if (window.attachEvent) {
            window.attachEvent(
                'onresize',
                function () {
                    p.updateCanvasDimensions();
                }
            );
        }
        else if (window.addEventListener) {
            window.addEventListener(
                'resize',
                function () {
                    p.updateCanvasDimensions();
                },
                true
            );
        }
        else {
            //The browser does not support Javascript event binding
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
