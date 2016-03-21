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

    w.onkeydown = (function (controller) { return (function (e) {
      controller.processInput(e);
    })})(this.playerController);

    w.onkeyup = (function (controller) { return (function (e) {
      controller.processInput(e);
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

class MoveState {
  moveLeft: boolean;
  moveRight: boolean;
  moveUp: boolean;
  moveDown: boolean;

  constructor () {
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
  }
}

class Entity implements Renderable {
  position: Vector;
  sprite: Sprite;
  stepper: Timestepper;
  controller: Controller;
  moveState: MoveState;

  constructor(p: Vector, s: Sprite, stp: Timestepper, c: Controller) {
    this.position = p;
    this.sprite = s;
    this.stepper = stp;
    this.controller = c;
    this.moveState = new MoveState();
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
    var velocity = new Vector(0, 0);
    if (actor.moveState.moveLeft) { velocity.x -= 1.0; }
    if (actor.moveState.moveRight) { velocity.x += 1.0; }
    if (actor.moveState.moveUp) { velocity.y -= 1.0; }
    if (actor.moveState.moveDown) { velocity.y += 1.0; }
    actor.position.translate(velocity.mul(dt * this.SPEED));
  }
}

class PlayerController implements Controller {
  private commandBuffer: CommandBuffer;
  schema: ControlSchema;

  constructor(schema: ControlSchema) {
    this.schema = schema;
    this.commandBuffer = new CommandBuffer();
  }

  processInput(e: KeyboardEvent) {
    this.commandBuffer.add(this.schema.processInput(e));
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
      this.buffer[cmd].execute(actor);
    }
  }

  empty() {
    this.buffer = {};
  }
}

class MoveLeft implements Command {
  cmdname: string;
  active: boolean;

  constructor(active: boolean) {
    this.cmdname = "moveLeft";
    this.active = active;
  }

  execute(actor: Entity) {
    actor.moveState[this.cmdname] = this.active;
  }
}

class MoveRight implements Command {
  cmdname: string;
  active: boolean;

  constructor(active: boolean) {
    this.cmdname = "moveRight";
    this.active = active;
  }

  execute(actor: Entity) {
    actor.moveState[this.cmdname] = this.active;
  }
}

class MoveUp implements Command {
  cmdname: string;
  active: boolean;

  constructor(active: boolean) {
    this.cmdname = "moveUp";
    this.active = active;
  }

  execute(actor: Entity) {
    actor.moveState[this.cmdname] = this.active;
  }
}

class MoveDown implements Command {
  cmdname: string;
  active: boolean;

  constructor(active: boolean) {
    this.cmdname = "moveDown";
    this.active = active;
  }
  
  execute(actor: Entity) {
    actor.moveState[this.cmdname] = this.active;
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
  processInput(key: KeyboardEvent): Command;
}

class DefaultControlSchema implements ControlSchema {
  private schema: Object;
  constructor() {
    this.schema = {
      "keydown": {
        65: new MoveLeft(true)
      , 68: new MoveRight(true)
      , 83: new MoveDown(true)
      , 87: new MoveUp(true)
      },
      "keyup": {
        65: new MoveLeft(false)
      , 68: new MoveRight(false)
      , 83: new MoveDown(false)
      , 87: new MoveUp(false)
      }
    };
  }

  processInput(e: KeyboardEvent): Command {
    var cmd = this.schema[e.type][e.which];
    if (!cmd) {
      cmd = new NullCommand();
    }
    return cmd;
  }
}
