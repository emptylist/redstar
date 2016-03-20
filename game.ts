window.onload = main;
var DEBUG = true;

function main() {
  var background = document.getElementById("background");
  var foreground = document.getElementById("foreground");
  var hud = document.getElementById("hud");
  var game = new Game(background, foreground, hud);
  var ts = performance.now();

  function update(time) {
    var dt = time - ts;
    ts = time;
    game.update(dt / 1000);
    window.requestAnimationFrame(update);
  }

  window.requestAnimationFrame(update);
}

class Game {
  hud: HTMLElement;
  background: CanvasRenderingContext2D;
  foreground: CanvasRenderingContext2D;
  player: Entity;

  constructor(background, foreground, hud) {
    this.hud = hud;
    this.background = background.getContext("2d");
    this.foreground = foreground.getContext("2d");
    
    this.player = new Entity(new Vector(100, 100), new Vector(40, 40), spriteMaker("player"));
  }

  update(dt: number): void {
    this.player.update(dt);
    this.foreground.clearRect(0, 0, 600, 640);
    this.player.render(this.foreground);
  }
}

class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  translate(v: Vector): void {
    this.x += v.x;
    this.y += v.y;
  }

  add(v: Vector): Vector {
    var x = this.x + v.x;
    var y = this.y + v.y;
    return new Vector(x, y);
  }

  scale(z: number): void {
    this.x *= z;
    this.y *= z;
  }

  mul(z: number): Vector {
    var x = this.x * z;
    var y = this.y * z;
    return new Vector(x, y);
  }
}

interface Renderable {
  render(ctx: CanvasRenderingContext2D): void;
}

class Sprite {
  canvas: HTMLCanvasElement;
  height: number;
  width: number;

  constructor(c: HTMLCanvasElement, h: number, w: number) {
    this.canvas = c;
    this.height = h;
    this.width = w;
  }
}

function buildSprite(name) {
  var canvas = document.createElement("canvas");
  canvas.height = 32;
  canvas.width = 32;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "steelblue";
  ctx.fillRect(2, 2, 28, 28);
  return new Sprite(canvas, canvas.height, canvas.width);
}

var spriteMaker = (function () {
  var spriteMap = {};
  
  return (function(name: string) {
    var sprite = spriteMap[name];
    if (!sprite) {
      sprite = buildSprite(name)
      spriteMap[name] = sprite;
    }
    return sprite;
  })
})();

interface Timestepper {
  step(dt: number, actor: Entity): void;
}

interface Controller {
  update(actor: Entity): void;
}

interface Command {
  cmdname: string;
  execute(actor: Entity): void;
}

class Entity implements Renderable {
  position: Vector;
  velocity: Vector;
  sprite: Sprite;
  stepper: Timestepper;
  controller: Controller;

  constructor(p: Vector, s: Sprite, stp: Timestepper, c: Controller) {
    this.position = p;
    this.sprite = s;
    this.stepper = stp;
    this.controller = c;
    this.velocity = new Vector(0, 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.sprite.canvas, Math.floor(this.position.x), Math.floor(this.position.y))
  }

  update(dt: number): void {
    this.stepper.step(dt, this)
  }
}

class PlayerTimestepper implements Timestepper {
  step(dt: number, actor: Entity): void {
    actor.position.translate(actor.velocity.mul(dt));
  }
}

class PlayerController implements Controller {
  private commandBuffer: CommandBuffer;
  schema: ControlSchema;

  constructor(schema: ControlSchema) {
    this.schema = schema;
  }

  update(player: Entity) {
    for (var cmd in this.commandBuffer) {
      this.commandBuffer[cmd].execute(player);
    }
    this.commandBuffer.empty();
  }
}

class CommandBuffer {
  private buffer: Object;

  constructor() {
    this.buffer = {};
  }

  add(cmd: Command): void  {
    this.buffer[cmd.cmdname] = cmd;
  }

  remove(cmd: Command) {
    delete this.buffer[cmd.cmdname];
  }

  empty() {
    this.buffer = {};
  }
}

interface ControlSchema {}
