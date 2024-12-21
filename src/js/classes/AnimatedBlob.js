import blobshape from "blobshape";

export default class AnimatedBlob {
    constructor(p, x, y) {
        this.p = p;
        this.x = x;
        this.y = y;
        this.speed = 8;
        this.size = p.width / 8;
        this.growth = parseInt(p.random(3, 9));
        this.edges = parseInt(p.random(16, 32));
        this.seed = p.random(1, 100);
        this.fillHue = p.random(0, 360);
        this.strokeHue = p.random(0, 360);
        this.time = 0; // Initialize time for vertex animation
        this.timeSpeed = 0.05; // Controls animation speed
        this.whiteStroke = Math.random() < 0.5;

        const { path } = blobshape({
            size: this.size,
            growth: this.growth,
            edges: this.edges,
            seed: this.seed
        });
        this.pathArray = this.parseSVGPath(path);
    }

    parseSVGPath = (pathData) => {
        let commands = pathData.match(/[a-df-z][^a-df-z]*/gi);
        let pathArray = [];
        
        for (let cmd of commands) {
            let command = cmd.charAt(0);
            let params = cmd.slice(1).split(/[\s,]+/).map(Number);
            pathArray.push([command, ...params]);
        }
        
        return pathArray;
    }

    update() {
        // Increase time for continuous animation
        this.time += this.timeSpeed;

        // You can also update size if desired, but vertex animation alone is enough
        this.size += this.speed;

        // Recalculate blob path with vertex perturbation
        const { path } = blobshape({
            size: this.size,
            growth: this.growth,
            edges: this.edges,
            seed: this.seed
        });
        this.pathArray = this.parseSVGPath(path);
    }

    perturbVertex(x, y, index) {
        // Perturb the vertex position using a sine or noise function based on time and vertex index
        let offsetX = Math.sin(this.time + index) * 10; // Adjust '10' for more/less perturbation
        let offsetY = Math.cos(this.time + index) * 10; // Adjust '10' for more/less perturbation
        return [x + offsetX, y + offsetY];
    }

    draw() {
        const translateX = this.x - this.size / 2;
        const translateY = this.y - this.size / 2;

        this.p.push();
        this.p.translate(translateX, translateY);
        this.p.fill(this.fillHue, 100, 100, 0.33);
        if(this.whiteStroke) {
            this.p.stroke(this.strokeHue, 0, 100, 1);
        }
        else {
            this.p.stroke(this.strokeHue, 100, 100, 0.66);
        }
        this.p.beginShape();

        for (let i = 0; i < this.pathArray.length; i++) {
            let cmd = this.pathArray[i];
            let command = cmd[0];
            let params = cmd.slice(1);

            // Skip perturbing for the first and last vertices
            if ((i < 2 || i > this.pathArray.length - 3) && command === 'M') {
                this.p.vertex(params[0], params[1]);  // Draw without perturbation
            } else if ((i < 2 || i > this.pathArray.length - 3) && command === 'Q') {
                this.p.quadraticVertex(params[0], params[1], params[2], params[3]);  // No perturbation
            } else {
                // Perturb the inner vertices as before
                if (command === 'M') {
                    let [perturbedX, perturbedY] = this.perturbVertex(params[0], params[1], i);
                    this.p.vertex(perturbedX, perturbedY);
                } else if (command === 'Q') {
                    let [perturbedX1, perturbedY1] = this.perturbVertex(params[0], params[1], i);
                    let [perturbedX2, perturbedY2] = this.perturbVertex(params[2], params[3], i + 1);
                    this.p.quadraticVertex(perturbedX1, perturbedY1, perturbedX2, perturbedY2);
                }
            }
        }

        this.p.endShape(this.p.CLOSE);
        this.p.translate(-translateX, -translateY);
        this.p.pop();
    }
}
