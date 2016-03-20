window.onload = main;
var DEBUG = true;

function main() {
  var background = document.getElementById("background");
  var foreground = document.getElementById("foreground");
  var hud = document.getElementById("hud");
  var game = new Game(window, background, foreground, hud);
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
  controlSchema: ControlSchema;
  playerController: Controller;
  player: Entity;

  constructor(w, background, foreground, hud) {
    this.hud = hud;
    this.background = background.getContext("2d");
    this.foreground = foreground.getContext("2d");
    this.controlSchema = new DefaultControlSchema();
    this.playerController = new PlayerController(this.controlSchema);
    this.player = new Entity(new Vector(100, 100)
      , spriteMaker("player")
      , new PlayerTimestepper()
      , this.playerController);

    w.onkeypress = (function (controller) { return (function (e) {
      controller.processInput(e.which);
    })})(this.playerController);
      
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
    this.controller.update(this);
    this.stepper.step(dt, this)
  }
}

class PlayerTimestepper implements Timestepper {
  private SPEED: number;

  constructor() {
    this.SPEED = 40;
  }
  step(dt: number, actor: Entity): void {
    actor.position.translate(actor.velocity.mul(dt * this.SPEED));
  }
}

class PlayerController implements Controller {
  private commandBuffer: CommandBuffer;
  schema: ControlSchema;

  constructor(schema: ControlSchema) {
    this.schema = schema;
    this.commandBuffer = new CommandBuffer();
  }

  processInput(key: number) {
    this.commandBuffer.add(this.schema.processInput(key));
    console.log(this.commandBuffer);
  }

  update(player: Entity) {
    this.commandBuffer.executeCommands(player);
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

  executeCommands(actor: Entity) {
    for (var cmd in this.buffer) {
      console.log(this.buffer[cmd]);
      this.buffer[cmd].execute(actor);
    }
  }

  empty() {
    this.buffer = {};
  }
}

class MoveLeft implements Command {
  cmdname: string;

  constructor() {
    this.cmdname = "MoveLeft";
  }

  execute(actor: Entity) {
    actor.velocity.x = -1.0;
  }
}

class MoveRight implements Command {
  cmdname: string;

  constructor() {
    this.cmdname = "MoveRight";
  }

  execute(actor: Entity) {
    actor.velocity.x = 1.0;
  }
}

class MoveUp implements Command {
  cmdname: string;

  constructor() {
    this.cmdname = "MoveUp";
  }

  execute(actor: Entity) {
    actor.velocity.y = -1.0;
  }
}

class MoveDown implements Command {
  cmdname: string;

  constructor() {
    this.cmdname = "MoveDown";
  }
  
  execute(actor: Entity) {
    actor.velocity.y = 1.0;
  }
}

class NullCommand implements Command {
  cmdname: string;

  constructor () {
    this.cmdname = "NullCommand";
  }

  execute(actor: Entity) {}
}

interface ControlSchema {
  processInput(key: number): Command;
}

class DefaultControlSchema implements ControlSchema {
  private schema: Object;
  constructor() {
    this.schema = {
      65: new MoveLeft(),
      68: new MoveRight(),
      83: new MoveDown(),
      87: new MoveUp(),
    };
  }

  processInput(key: number): Command {
    var cmd = this.schema[key];
    if (!cmd) {
      cmd = new NullCommand();
    }
    return cmd;
  }
}
