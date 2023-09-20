// Helper Functions
const computeDistance = (body1, body2) => {
  return Math.sqrt((body2.x - body1.x) ** 2 + (body2.y - body1.y) ** 2);
};

const computeGravitationalForce = (body1, body2) => {
  const G = 1;
  const dx = body2.x - body1.x;
  const dy = body2.y - body1.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);

  if (distance === 0) return { x: 0, y: 0 }; // prevents division by zero

  const force = (G * body1.mass * body2.mass) / distance ** 2;
  const forceX = (force * dx) / distance;
  const forceY = (force * dy) / distance;

  return {
    x: forceX,
    y: forceY,
  };
};

// Initialize Canvas
const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");

// Initialize Bodies
class Body {
  constructor({ x, y, radius, color }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Planet extends Body {
  constructor({ id, x, y, u, v, mass, radius, color, isFragment = false }) {
    super({ x, y, radius, color });
    this.id = id;
    this.u = u;
    this.v = v;
    this.mass = mass;
    this.isFragment = isFragment;
    this.isDestroyed = false;
  }

  updatePosition() {
    // Gravitational force from the Sun
    let forceFromSun = computeGravitationalForce(this, sun);
    this.u += forceFromSun.x / this.mass;
    this.v += forceFromSun.y / this.mass;

    // Gravitational forces from other Planets
    for (let otherPlanet of planets) {
      if (
        this.id === otherPlanet.id ||
        this.isFragment ||
        otherPlanet.isFragment
      )
        continue;

      let forceFromOtherPlanet = computeGravitationalForce(this, otherPlanet);
      this.u += forceFromOtherPlanet.x / this.mass;
      this.v += forceFromOtherPlanet.y / this.mass;
    }

    this.x += this.u;
    this.y += this.v;
  }

  createFragments() {
    const maxPieces = 10;
    const pieces = Math.min(maxPieces, Math.ceil(this.mass));
    let planetFragments = [];

    Array(pieces)
      .fill(0)
      .forEach(() => {
        let angle = Math.random() * Math.PI * 2;

        let mass = this.mass / pieces;
        let radius = 1 + mass;

        planetFragments.push(
          new Planet({
            id: planets.length,
            x: this.x,
            y: this.y,
            u: this.u + Math.cos(angle),
            v: this.v + Math.sin(angle),
            radius,
            mass,
            color: this.color,
            isFragment: true,
          })
        );
      });

    return planetFragments;
  }
}

class Sun extends Body {
  constructor({ x, y, mass, radius, color }) {
    super({ x, y, radius, color });
    this.mass = mass;
    this.glowIncrement = 0;
    this.glowDirection = 1;
  }

  draw() {
    ctx.fillStyle = this.color;

    let glowStrength = 0.5 + 0.5 * Math.sin(this.glowIncrement);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 + 20 * glowStrength;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();

    this.glowIncrement += 0.02 * this.glowDirection;
    if (this.glowIncrement >= Math.PI || this.glowIncrement <= 0) {
      this.glowDirection *= -1;
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
}

const sun = new Sun({
  x: canvas.width / 2,
  y: canvas.height / 2,
  mass: 1000,
  radius: 30,
  color: "yellow",
});
let planets = [];
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };

const numberOfStars = 200;
let backgroundStars = [];
Array(numberOfStars)
  .fill(0)
  .forEach(() => {
    backgroundStars.push(
      new Body({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2,
        color: "rgb(255, 255, 255, 0.8)",
      })
    );
  });

// Initialize Events
let tooltip = document.querySelector("#tooltip");
let isDragging = false;
let showArrow = false;
canvas.addEventListener("mousedown", function (event) {
  isDragging = true;
  dragStart.x = event.clientX;
  dragStart.y = event.clientY;
  dragEnd.x = dragStart.x;
  dragEnd.y = dragStart.y;
});

canvas.addEventListener("mouseup", function (event) {
  if (isDragging) {
    let mass = Math.random() * 5 + 3;
    let radius = 2 + mass;

    planets.push(
      new Planet({
        id: planets.length,
        x: dragStart.x,
        y: dragStart.y,
        u: (dragStart.x - dragEnd.x) * 0.02,
        v: (dragStart.y - dragEnd.y) * 0.02,
        radius,
        mass,
        color: `rgb(
          ${Math.random() * 255 + 30}, 
          ${Math.random() * 255 + 30}, 
          ${Math.random() * 255 + 30})
        `,
      })
    );

    isDragging = false;
  }

  if (tooltip) {
    tooltip.style.opacity = 0;
    tooltip = null; // Clear the reference to ensure tooltip won't show up again
  }
  showArrow = false;
});

canvas.addEventListener("mousemove", function (event) {
  if (isDragging) {
    dragEnd.x = event.clientX;
    dragEnd.y = event.clientY;
    showArrow = true;
  }
});

// Canvas Functions
const handleCollisions = () => {
  let newBodies = [];

  for (let planet of planets) {
    if (planet.isDestroyed) continue;
    if (computeDistance(planet, sun) < planet.radius + sun.radius) {
      planet.isDestroyed = true;
      continue;
    }

    for (let otherPlanet of planets) {
      if (
        planet.id === otherPlanet.id ||
        otherPlanet.isDestroyed ||
        planet.isFragment ||
        otherPlanet.isFragment
      )
        continue;

      if (
        computeDistance(planet, otherPlanet) <
        planet.radius + otherPlanet.radius
      ) {
        newBodies = newBodies.concat(planet.createFragments());
        newBodies = newBodies.concat(otherPlanet.createFragments());
        planet.isDestroyed = true;
        otherPlanet.isDestroyed = true;
        break;
      }
    }
  }

  planets = planets.filter((planet) => !planet.isDestroyed);
  planets = planets.concat(newBodies);
};

const updatePlanetPositions = () => {
  handleCollisions();
  planets.forEach((planet) => planet.updatePosition());
};

const drawArrow = (start, end) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const length = computeDistance(start, end);
  const headLength = 10;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(
    start.x + headLength * Math.cos(angle - Math.PI / 6),
    start.y + headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(
    start.x + headLength * Math.cos(angle + Math.PI / 6),
    start.y + headLength * Math.sin(angle + Math.PI / 6)
  );

  ctx.strokeStyle = `rgb(${2.5 * length}, ${255 - 2.5 * length}, 0)`;
  ctx.lineWidth = 2;
  ctx.stroke();
};

const draw = () => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (showArrow) {
    drawArrow(dragStart, dragEnd);
  }

  backgroundStars.forEach((star) => star.draw());

  sun.draw();

  planets.forEach((planet) => planet.draw());

  updatePlanetPositions();

  requestAnimationFrame(draw);
};

draw();
