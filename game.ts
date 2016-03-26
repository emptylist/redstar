window.onload = main;
var DEBUG = true;

var SCREEN = (function (){
  var bkgrnd: any = document.getElementById("background");
  return {
    HEIGHT: bkgrnd.height,
    WIDTH: bkgrnd.width
  }
})();

function main() {
  var background = document.getElementById("background");
  var foreground = document.getElementById("foreground");
  var hud = document.getElementById("hud");
  var game = new Game(window, background, foreground, hud);
  var ts = performance.now();
  if (DEBUG) {
    var debugFPS = document.getElementById("fps");
  }

  function update(time) {
    var dt = time - ts;
    ts = time;
    game.update(dt / 1000);
    if (DEBUG) {
      debugFPS.innerHTML = "FPS: " + Math.floor(1.0/(dt/1000));
    }
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
  clear: boolean;
  playerProjectiles: ProjectileManager;

  constructor(w, background, foreground, hud) {
    this.hud = hud;
    this.background = background.getContext("2d");
    this.foreground = foreground.getContext("2d");
    this.controlSchema = new DefaultControlSchema();
    this.playerController = new PlayerController(this.controlSchema);
    this.playerProjectiles = new ProjectileManager();
    var basicWeapon = new Weapon("Bit Shooter", 
                                 "Shoots bitmaps", 
                                  3, 
                                  bitShooterProjs, 
                                  this.playerProjectiles);
    this.player = new Player(new Vector(300, 320)
      , spriteMaker("player")
      , new PlayerTimestepper()
      , this.playerController
      , basicWeapon);
    this.clear = true;

    w.onkeydown = (function (controller, game) { 
      var keytraps = [32];
      return (function (e) {
      console.log(e.which);
      if (e.which === 16) {
        game.clear = false;
      }
      controller.processInput(e);
      if (keytraps.some(function (key) { return key == e.which })) {
        e.preventDefault()
      }
    })})(this.playerController, this);

    w.onkeyup = (function (controller, game) { return (function (e) {
      if (e.which === 16) {
        game.clear = true;
      }
      controller.processInput(e);
    })})(this.playerController, this);
      
  }

  update(dt: number): void {
    this.player.update(dt);
    this.playerProjectiles.update(dt);
    if (this.clear) {
      this.foreground.clearRect(0, 0, 600, 640);
    }
    this.player.render(this.foreground);
    this.playerProjectiles.render(this.foreground);
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
  update: (actor: Entity) => void;
}

interface Command {
  cmdname: string;
  execute: (actor: Controllable) => void;
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

interface Controllable {
  controller: Controller;
}
  
class Entity implements Renderable {
  position: Vector;
  sprite: Sprite;
  timestepper: Timestepper;

  constructor(p: Vector, s: Sprite, stp: Timestepper) {
    this.position = p;
    this.sprite = s;
    this.timestepper = stp;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.sprite.canvas, Math.floor(this.position.x), Math.floor(this.position.y))
  }

  update(dt: number): void {
    this.timestepper.step(dt, this)
  }
}

class Projectile extends Entity {
  power: number;

  constructor(p: Vector, s: Sprite, stp: Timestepper, power: number) {
    super(p, s, stp);
    this.power = power;
  }
}

class ProjectileManager  implements Renderable {
  private projectiles: Array<Projectile>;

  constructor() {
    this.projectiles = new Array<Projectile>();
  }

  update(dt: number): void {
    for (var i = 0; i < this.projectiles.length; i++) {
      var p = this.projectiles[i];
      p.update(dt);
      if (p.position.x > SCREEN.WIDTH ||
          (p.position.x + p.sprite.width < 0) ||
          p.position.y > SCREEN.HEIGHT ||
          (p.position.y + p.sprite.height < 0)) {
        this.projectiles.splice(i,i);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (var i = 0; i < this.projectiles.length; i++) {
      this.projectiles[i].render(ctx);
    }
  }

  addProjectile(proj: Projectile): void {
    this.projectiles.push(proj);
  }
}

class Weapon {
  name: string;
  desc: string;
  rechargeTime: number;
  rechargeTimer: number;
  fire: (position: Vector) => void;

  constructor(name: string, 
              desc: string, 
              rechargeTime: number, 
              fire: (p: Vector) => Projectile,
              projectileManager: ProjectileManager)
              {
    this.name = name;
    this.desc = desc;
    this.rechargeTime = rechargeTime;
    this.fire = function (pos: Vector) {
      projectileManager.addProjectile(fire(pos));
    };
    this.rechargeTimer = 0;
  }
}

class Player extends Entity implements Controllable {
  controller: Controller;
  weapon: Weapon;
  moveState: MoveState;

  constructor(p: Vector, s: Sprite, stp: Timestepper, c: Controller, w: Weapon) {
    super(p, s, stp);
    this.controller = c;
    this.weapon = w;
    this.moveState = new MoveState();
  }

  update(dt: number): void {
    this.controller.update(this);
    this.timestepper.step(dt, this);
  }
}

class PlayerTimestepper implements Timestepper {
  private SPEED: number;

  constructor() {
    this.SPEED = 100;
  }
  step(dt: number, actor: Player): void {
    var velocity = new Vector(0, 0);
    if (actor.moveState.moveLeft) { velocity.x -= 1.0; }
    if (actor.moveState.moveRight) { velocity.x += 1.0; }
    if (actor.moveState.moveUp) { velocity.y -= 1.0; }
    if (actor.moveState.moveDown) { velocity.y += 1.0; }
    actor.position.translate(velocity.mul(dt * this.SPEED));
    actor.weapon.rechargeTimer = Math.max(actor.weapon.rechargeTimer - dt, 0);
  }
}

class SimpleBulletTimestepper implements Timestepper {
  private SPEED: number;
  private VELOCITY: Vector;

  constructor() {
    this.SPEED = 120;
    this.VELOCITY = new Vector(0, -1);
    this.VELOCITY.scale(this.SPEED);
  }

  step(dt: number, actor: Entity): void {
    actor.position.translate(this.VELOCITY.mul(dt));
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

  execute(actor: Player) {
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

  execute(actor: Player) {
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

  execute(actor: Player) {
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
  
  execute(actor: Player) {
    actor.moveState[this.cmdname] = this.active;
  }
}

class FireWeapon implements Command {
  cmdname: string;

  constructor () {
    this.cmdname = "fireWeapon";
  }

  execute(actor: Player) {
    if (actor.weapon.rechargeTimer === 0) {
      actor.weapon.fire(actor.position);
      actor.weapon.rechargeTimer = actor.weapon.rechargeTime
    }
  }
}

class NullCommand implements Command {
  cmdname: string;

  constructor () {
    this.cmdname = "NullCommand";
  }

  execute(actor: Player) {}
}

interface ControlSchema {
  processInput(key: KeyboardEvent): Command;
}

class DefaultControlSchema implements ControlSchema {
  private schema: Object;
  private nullCommand: NullCommand;
  constructor() {
    this.schema = {
      "keydown": {
        65: new MoveLeft(true)
      , 68: new MoveRight(true)
      , 83: new MoveDown(true)
      , 87: new MoveUp(true)
      , 32: new FireWeapon()
      },
      "keyup": {
        65: new MoveLeft(false)
      , 68: new MoveRight(false)
      , 83: new MoveDown(false)
      , 87: new MoveUp(false)
      , 32: new FireWeapon()
      }
    };
    this.nullCommand = new NullCommand();
  }

  processInput(e: KeyboardEvent): Command {
    var cmd = this.schema[e.type][e.which];
    if (!cmd) {
      cmd = this.nullCommand;
    }
    return cmd;
  }
}

var bitShooterProjs = (function() {
  var canvas = document.createElement("canvas");
  canvas.height = 4;
  canvas.width = 4;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "steelblue";
  ctx.fillRect(0, 0, 4, 4);
  var sprite = spriteMaker("bits");
  var stp = new SimpleBulletTimestepper();
  return (function (p: Vector) {
    var projP = new Vector(p.x, p.y);
    return new Projectile(projP, sprite, stp, 1.0);
  })
})();

