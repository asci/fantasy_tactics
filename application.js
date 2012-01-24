/*
 * Turn based social game on HTML5 canvas
 * Client side
 * author: asci
 * e-mail: asci@yandex.ru
 * 
 * --------TODO--------
 * 
 * Изменить структуру приложения, убрать большинство глобальных переменных!!
 * 
 * Сделать контроллер загрузки ресурсов
 * Попробовать использовать SocketIO для взаимодействия с клиентом
 * Подгрузка карты с сервера: сделать легкий вариант юнитов.  
 * Продолжить описывать классы игры
 * Перемещение зданий, продажа зданий
 * Контратака врагов, базовый ангерпоинтс
 * Загрузка карты как с сервера так и генерация
 * Вариант редактора карт
 * Реализовать популяцию
 * Проверка на текущий ход (например при передвижении юнита)
 */
$(function(){
	function Application () {
		if ( typeof Application.instance === Object) {
			return Application.instance;
		}
		
		this.width = 730;
		this.height = 600;

		this.canvas = $('#game')[0];
		this.canvas.width = this.width;
 		this.canvas.height = this.height;

		this.ctx = this.canvas.getContext("2d") 		
		
		this.buffer = document.createElement("canvas");
		this.buffer.width = this.width;
		this.buffer.height = this.height;
		this.buffer.ctx = this.buffer.getContext('2d');
		
		this.lastMouseEvent = null;
		this.cursorState = null;
		this.turn = true;
		this.drag = false;
		this.ticks = new Date();
		this.zoom = 0.75;
		this.field = new Field(); 
		
		this.fullscreen = function () {
			if (this.width != window.screen.width) {
				this.width = window.screen.width;
				this.height = window.screen.height - 25;
				canvas.width = this.width;
				canvas.height = this.height;
				buffer.width = canvas.width;
				buffer.height = canvas.height;
			} else {
				this.width = 730;
				this.height = 600;
				canvas.width = this.width;
				canvas.height = this.height;
				buffer.width = canvas.width;
				buffer.height = canvas.height;
			}
		}
		Application.instance = this;
	}
	
	var app = new Application();
	
	function Field () {
		this.offsetX = 0;
		this.offsetY = 0;
		this.mapSizeX = 49;
		this.mapSizeY = 49;
		this.cellSize = 96;
		this.tiles = [];
		this.units = [];
		this.playerUnits = [];
		this.enemyUnits = [];
		this.neutralUnits = [];
		this.items = [];
		this.selectedUnit = null;
		this.ghostUnit = null;
		this.attakingUnits = [];
	}
	var canvas = $('#game')[0],
		ctx, buffer;
		
	var player_units = [],
		enemy_units = [],
		items = [],
		walkable = [],
		text_messages = [],
		ghost_unit,
		attacking_units = [],
		hovered_cells = [],
		render_cells = [],
		selected_unit;
	
	var	fps = 0, framerate, fps_ui,
		drag = false,
		ticks,
		MAP_HEIGHT = 47,
		MAP_WIDTH = 47,
		APP_WIDTH = 730,
		APP_HEIGHT = 600,
		last_event,
		last_point = {x:0, y:0},
		select_unit,
		response,
		turn = true,
		cursor_state = 0,
		max_range = 3,
		modal = false,
		CELL_SIZE = 96;
				
	var fog = new Image();
		fog.src = "./sprites/fog.png";
	var grass = new Image();
		grass.src = "./sprites/grass1.png";
	var dirt = new Image();
		dirt.src = "./sprites/dirt1.png";
	var road = new Image();
		road.src = "./sprites/road.png";
	var mounts = new Image();
		mounts.src = "./sprites/mounts.png";
	var forest1 = new Image();
		forest1.src = "./sprites/forest1.png";
	var forest2 = new Image();
		forest2.src = "./sprites/forest2.png";
	var forest3 = new Image();
		forest3.src = "./sprites/forest3.png";
	var forest = [forest1, forest2, forest3];
	var humanHouse = new Image();
		humanHouse.src = "./sprites/humanHouse.png";
	var elvenHouse = new Image();
		elvenHouse.src = "./sprites/elvenHouse.png";
	var dwarvenHouse = new Image();
		dwarvenHouse.src = "./sprites/dwarvenHouse.png";
	var village = new Image();
		village.src = "./sprites/village.png";
	var barracks = new Image();
		barracks.src = "./sprites/barracks.png";

	var book = new Image();
		book.onload = function (){
			for (var i=0; i < 10; i++) {
			  items[i] = new Item(book, g_random(1000), g_random(1000)); 
			}
		};
		book.src = "./sprites/book4.png";
	var book_glow = new Image();
		book_glow.src = "./sprites/book4_glow.png";
	//Здания:		
	var altar = animationLoader("altar", 4);
	var windmill = animationLoader("windmill", 18);
	//Фехтовальщик
	var fencerIdle = animationLoader("fencerIdle", 7);
	var fencerAttack = animationLoader("fencerAttack", 9);
	var fencerDie = animationLoader("fencerDie", 5);
	var fencer = fencerIdle;
	//Орк
	var gruntIdle = animationLoader("gruntIdle", 1);
	var gruntAttack = animationLoader("gruntAttack", 5);
	var gruntDie = animationLoader("gruntDie", 8);
	var grunt = gruntIdle;
	//Скелет
	var skeletonIdle = animationLoader("skeletonIdle", 3);
	var skeletonDie = animationLoader("skeletonDie", 7);
	var skeletonAttack = animationLoader("skeletonAttack", 5);
	var skeleton = skeletonIdle;
	
	function a_star(start, destination, columns, rows) {
		board = walkable;
		//Create start and destination as true nodes
		start = new node(start[0], start[1], -1, -1, -1, -1);
		destination = new node(destination[0], destination[1], -1, -1, -1, -1);

		var open = []; //List of open nodes (nodes to be inspected)
		var closed = []; //List of closed nodes (nodes we've already inspected)

		var g = 0; //Cost from start to current node
		var h = heuristic(start, destination); //Cost from current node to destination
		var f = g+h; //Cost from start to destination going through the current node
		var i;
		//Push the start node onto the list of open nodes
		open.push(start); 

		//Keep going while there's nodes in our open list
		while (open.length > 0) {
			//Find the best open node (lowest f value)

			//Alternately, you could simply keep the open list sorted by f value lowest to highest,
			//in which case you always use the first node
			var best_cost = open[0].f;
			var best_node = 0;

			for (i = 1; i < open.length; i++) {
				if (open[i].f < best_cost) {
					best_cost = open[i].f;
					best_node = i;
				}
			}

			//Set it as our current node
			var current_node = open[best_node];

			//Check if we've reached our destination
			if (current_node.x == destination.x && current_node.y == destination.y)
			{
				var path = [destination]; //Initialize the path with the destination node

				//Go up the chain to recreate the path 
				while (current_node.parent_index != -1)
				{
					current_node = closed[current_node.parent_index];
					path.unshift(current_node);
				}

				return path;
			}

			//Remove the current node from our open list
			open.splice(best_node, 1);

			//Push it onto the closed list
			closed.push(current_node);

			//Expand our current node (look in all 8 directions)
			for (var new_node_x = Math.max(0, current_node.x - 1); new_node_x <= Math.min(columns - 1, current_node.x + 1); new_node_x++) {
				for (var new_node_y = Math.max(0, current_node.y - 1); new_node_y <= Math.min(rows - 1, current_node.y + 1); new_node_y++) {
					if ((new_node_x == current_node.x) || (new_node_y == current_node.y)) {
						if ((!!(board[new_node_x][new_node_y]) === false ) || (destination.x == new_node_x && destination.y == new_node_y)) { 
						   //See if the node is already in our closed list. If so, skip it.
							var found_in_closed = false;
							for (i in closed) {
								if ((closed[i].x == new_node_x) && (closed[i].y == new_node_y)) {
									found_in_closed = true;
									break;
								}
							}
	
							if (found_in_closed) {
								continue;
							}
	
							//See if the node is in our open list. If not, use it.
							var found_in_open = false;
							for (i in open) {
								if (open[i].x == new_node_x && open[i].y == new_node_y) {
									found_in_open = true;
									break;
								}
							}
	
							if (!found_in_open) {
								var new_node = new node(new_node_x, new_node_y, closed.length-1, -1, -1, -1);
	
								new_node.g = current_node.g + Math.floor(Math.sqrt(Math.pow(new_node.x-current_node.x, 2)+Math.pow(new_node.y-current_node.y, 2)));
								new_node.h = heuristic(new_node, destination);
								new_node.f = new_node.g + new_node.h;
	
								open.push(new_node);
							}
						}
					}
				}
			}
		}
		return [];
	}

	//An A* heurisitic must be admissible, meaning it must never overestimate the distance to the goal.
	//In other words, it must either underestimate or return exactly the distance to the goal.
	function heuristic(current_node, destination) {
		//Find the straight-line distance between the current node and the destination. (Thanks to id for the improvement)
		//return Math.floor(Math.sqrt(Math.pow(current_node.x-destination.x, 2)+Math.pow(current_node.y-destination.y, 2)));
		var x = current_node.x - destination.x;
		var y = current_node.y - destination.y;
		return x * x + y * y;
	}


	/* Each node will have six values: 
	 X position
	 Y position
	 Index of the node's parent in the closed array
	 Cost from start to current node
	 Heuristic cost from current node to destination
	 Cost from start to destination going through the current node
	*/	

	function node(x, y, parent_index, g, h, f) {
		this.x = x;
		this.y = y;
		this.parent_index = parent_index;
		this.g = g;
		this.h = h;
		this.f = f;
	}


	

	function animationLoader (name, count) {
		var result = [];
		if (count > 1) {
			for (var i = 1; i <= count; i++) {
				result.push(new Image());
				result[i - 1].src = "./sprites/" + name + i + ".png";
			}
		} else {
			result.push(new Image());
			result[0].src = "./sprites/" + name + 1 + ".png";
		}
		return result;
	}


	function User (name, sex) {
		var self = this;
		//General
		this.name = name;
		this.sex = sex;
		this.friends = [];
		//System
		this.max_energy = 100;
		this.energy_bonus = 0;
		this.energy_timer_count = 0;
		this.energy_timer = new Timer(1000, 10, function (timer) {
			self.update_energy_timer(timer);
		},  function () {
			self.update_energy();
		});
		this.update_energy_timer = function (timer) {
			this.energy_timer_count = timer.count;
		};
		this.update_energy = function () {
			//TODO Запрос к серверу
			this.energy++;
			if (this.energy < this.max_energy) {
				this.energy_timer = new Timer(1000, 10, function (timer) {
					self.update_energy_timer(timer);
				},  function () {
					self.update_energy();
				});
			}
		};
		this.consume_energy = function (x, y) {
		  if (this.energy > 0) {
		  	this.energy--;
		  	if (this.energy == this.max_energy - 1) {
				this.energy_timer = new Timer(1000, 10, function (timer) {
					self.update_energy_timer(timer);
				},  function () {
					self.update_energy();
				});
		  	}  
		  	return true;
		  } else {
		  	$("#buyEnery").show();
		  	modal = true;
		  	return false;
		  }
		};
		//Resources:
		this.gold = 1000;
		this.energy = 100;
		this.mandrake_root = 1;
		this.bay_leaf = 1;
		this.medal = 1;
		//Populations
		this.elf_population = 0;
		this.human_population = 100;
		this.dwarf_population = 0;
	}


	function AnimationOnce(images, speed, callback) {
		var self = this;
		this.frame=[];
		this.speed = speed;
		this.i = 0;
		this.max_i = images.length - 1;
		for (var j = 0; j < images.length; j++) {
			this.frame[j] = images[j];
		}
		this.animate = function () {
			if (this.i < this.max_i) {
				this.i++;
			} else {
				clearInterval(this.timer);
				callback();
			}
			this.image = this.frame[this.i];
		};
		this.image = this.frame[this.i];
		if (images.length > 1) {
			clearInterval(this.timer);
			this.timer = setInterval(function () {
				self.animate();
			}, this.speed);
		}
	}

	function Tween(obj, prop, target, speed, type, callback) {
		var _target = target;
		console.log(target, obj[prop], speed);
		var _speed = speed;
		var _step = (_target - obj[prop] ) / _speed;
		var self = this;
		self.update = function () {
		  if (Math.round(obj[prop]) != Math.round(_target)) {
		  	obj[prop] += _step;
		  	setTimeout(function () {
				self.update();
			  }, 30);
		  } else {
		  	callback();
		  }
		};
		self.update();
	}

	function Tile (instance) {
		mixIn(this, instance)
		this.x = this.map_x * app.field.cellSize; 
		this.y = this.map_y * app.field.cellSize;
		this.tile = lnd; 
		this.type = lndscp; 
		this.decor = null;
		this.unit = null;
		this.fog = fg;
		this.selected = null;
		this.hovered = null;
		this.highlighted = null;
	}
	function Animation(images, speed) {
		var self = this;
		this.frame=[];
		this.speed = speed;
		this.i = 0;
		this.max_i = images.length - 1;
		for (var j = 0; j < images.length; j++) {
			this.frame[j] = images[j];
		}
		this.animate = function () {
			if (this.i < this.max_i) {
				this.i++;
			} else {
				this.i = 0;
			}
			this.image = this.frame[this.i];
		};
		this.image = this.frame[this.i];
		if (images.length > 1) {
			clearInterval(this.timer);
			this.timer = setInterval(function () {
				self.animate();
			}, this.speed);
		}
	}
	
	function Timer(interval, count, onInterval, onFinish) {
		var self = this;
		this.count = 0;
		this.interval = interval;
		this.max_count = count;
		this.onInterval = onInterval;
		this.onFinish = onFinish;
		this.count_timer = setInterval(function () {
			if (self.count < self.max_count) {
				self.count++;
				self.onInterval(self);
			} else {
				self.onFinish();
				clearInterval(self.count_timer);
			}
		}, this.interval);
	}
		
	function TextMessage(text, x, y, duration, color) {
		var self = this;
		this.text = text;
		this.x = x;
		this.y = y;
		this.duration = duration;
		this.color = color;
		this.destr = function () {
			text_messages.splice(text_messages.indexOf(this), 1);
		}
		setTimeout(function () {
			self.destr();
		}, this.duration);
	}
	
	function Item(img, x, y){
		this.image = img;
		this.x = x;
		this.y = y;
		this.canv = document.createElement("canvas");
		this.canv.width = this.image.width;
		this.canv.height = this.image.height;
		this.ctx = this.canv.getContext('2d');
		this.ctx.drawImage(this.image, 0, 0, CELL_SIZE, CELL_SIZE);
		this.hovered = false;
		this.hover = function  () {
			this.hovered = true;
			this.image = book_glow;
		};
		this.unhover = function  () {
			this.hovered = false;
			this.image = book;
		};
		this.click = function  () {
			items.splice(items.indexOf(this), 1);
		};
		this.hit = function  (mx, my) {
			var clr;
			clr = this.ctx.getImageData((mx / app.zoom + app.field.offsetX - this.x), (my / app.zoom + app.field.offsetY - this.y), 1, 1).data;
			if (clr[3] > 250) {
				return true;
			} else {
				if (this.hovered) this.unhover();
				return false;
			}  
		}
	}
	
	function GhostBuilding(infoName) {
		if (selected_unit) {
			selected_unit.unselect();
		};
		var obj = getBuildingInfo(infoName);
		for (var prop in obj) {
			this[prop] = obj[prop]
		};
		this.x = 0;
		this.y = 0;
		this.image = eval(obj["baseImage"]);
		this.infoName = infoName;
		this.clear_under_cells = function () {
				while (this.under_cells.length>0) {//Delete all element of array, after setting highlight to off in app.field.tiles
					this.under_cells.shift(1).highlighted = null;
				};
		}
		this.can_build = false;
		this.build = function (map_x, map_y) {
			if (this.can_build) {
				if ((this.type == "military")&&(!this.on_road)) {
					return null;
				}
				this.clear_under_cells();
				return new Building({
									"hp"				:this.max_hp,
									"map_x"				:map_x,
									"map_y"				:map_y,
									"owner"				:"player",
									"infoName"			:this.infoName});
			} else {
				return null;
			};
		};
		this.under_cells = [];
		this.rebuild_under_cells = function(map_x, map_y){
			this.can_build = true;
			this.on_road = false;
			this.clear_under_cells();
			var i,j;
			for (i = Math.max(map_x - 1,0); i < Math.min(map_x + this.size_x + 1, MAP_WIDTH); i++){
				for (j = Math.max(map_y - 1,0); j < Math.min(map_y + this.size_y + 1, MAP_HEIGHT); j++){
					if ((i != map_x - 1 || j != map_y - 1) &&
						(i != map_x - 1 || j != map_y + this.size_y) &&
						(i != map_x + this.size_x || j != map_y - 1) &&
						(i != map_x + this.size_x || j != map_y  + this.size_y)){
						//Проверяем клетки для появления юнитов, что бы там была хоть одна дорога
						if (((i == map_x - 1)||(j == map_y - 1)||(i == map_x + this.size_x)||(j == map_y + this.size_y))&&(this.type == "military")) {
							if (app.field.tiles[i][j].type == "road") {
								this.on_road = true;
								app.field.tiles[i][j].highlighted = g_rgba(255, 255, 50, 0.5);
								this.under_cells.push(app.field.tiles[i][j]);
							} else {
								app.field.tiles[i][j].highlighted = g_rgba(255, 50, 50, 0.5);
								this.under_cells.push(app.field.tiles[i][j]);
							}
						} else {
							if (!((i == map_x - 1)||(j == map_y - 1)||(i == map_x + this.size_x)||(j == map_y + this.size_y))) {
								if (walkable[i][j] == 0) {
									app.field.tiles[i][j].highlighted = g_rgba(50, 255, 50, 0.5);
									this.under_cells.push(app.field.tiles[i][j]);
								} else {
									app.field.tiles[i][j].highlighted = g_rgba(255, 50, 50, 0.5);
									this.under_cells.push(app.field.tiles[i][j]);
									this.can_build = false;
								}
							}
						}
					}
				}
			}
			if ((this.type == "military")&&(!this.on_road)) {
				for (i = 0; l = this.under_cells.length, i < l; i++) {
					this.under_cells[i].highlighted = g_rgba(255, 50, 50, 0.5);
				};
			};
		};
		this.rebuild_under_cells(0,0);
	};
	


	var buildingsInfo = JSON.parse($.ajax({url: "http://127.0.0.1/buildings_info", contentType:'application/json', async:false}).responseText);
	var userBuildings = JSON.parse($.ajax({url: "http://127.0.0.1/user_buildings", contentType:'application/json', async:false}).responseText);
	var charactersInfo = JSON.parse($.ajax({url: "http://127.0.0.1/characters_info", contentType:'application/json', async:false}).responseText);
	var userCharacters = JSON.parse($.ajax({url: "http://127.0.0.1/user_characters", contentType:'application/json', async:false}).responseText);

	function getBuildingInfo (infoName) {
	  return buildingsInfo[infoName];
	}
	
	function mixIn (obj, mod) {
		for (var prop in mod) {
			obj[prop] = mod[prop]
		};
	}
	
	//Организовать прототипное наследование!!!
	//Types: "house", "village", "military", "defense", "resource"
	function Building(instance){
		mixIn(this, instance);
		var obj = getBuildingInfo(this.infoName);
		mixIn(this, obj);
		this.x = this.map_x * CELL_SIZE;
		this.y = this.map_y * CELL_SIZE;
		if (eval(obj["baseImage"]) instanceof Array){
			this.image = new Animation(eval(obj["baseImage"]), 20);
		} else {
			this.image = new Animation([eval(obj["baseImage"])], 5000);
		}
		var k,l;
		var self = this;
		for (k=0; k < this.size_x; k++) {
			for (l=0; l < this.size_y; l++) {
				walkable[this.map_x + k][this.map_y + l] = 1;
				app.field.tiles[this.map_x + k][this.map_y + l].unit = this;
			}
		}
		if (this.type == "resource") {
			this.set_collect_timer = function () {
				this.ready_to_collect = false;
				this.next_collect_count = 0;
				this.collect_timer = new Timer(1000, this.collectTime, self.collect_timer_tick, function () {self.ready_to_collect = true});
			};
			this.add_gold = function () {
				user.gold += this.goldBonus;
				text_messages.push(new TextMessage("+100 Gold", app.field.tiles[this.map_x][this.map_y].x, app.field.tiles[this.map_x][this.map_y].y, 3000, g_rgba(255, 255, 0, 255)));
				this.set_collect_timer();
			};
			this.collect_timer_tick = function (timer) {
				this.next_collect_count = timer.count;
			};
			this.collect_timer_finish = function (timer) {
				this.ready_to_collect = true;
			};
			this.conquered = function () {
				this.owner = "player";
	
				if (this.type == "resource") {
					this.set_collect_timer();
				};
			};
			if (this.owner == "player") {
					this.set_collect_timer();
			};
		}
		if (this.type == "military") {
			this.training = false;
			this.set_train_timer = function (time) {
				this.unit_ready = false;
				this.train_count = 0;
				this.train_timer = new Timer(1000, time, self.train_timer_tick, function () {self.unit_ready = true});
				this.training = true;
			};
			
			this.add_unit = function () {
				this.draw_production_cells();
				var i = 0,
					can_add = false, 
					len = this.production_cells.length,
					map_x = 0, map_y = 0;
					
				if (this.production_cells.length > 0) {
					map_x = this.production_cells[0].x / CELL_SIZE;
					map_y = this.production_cells[0].y / CELL_SIZE;
					can_add = true;
				};
				if (can_add) {
					var un = new Character({
						"id": app.field.units.length,
						"hp": getCharacterInfo(this.trainUnit).max_hp,
						"map_x": map_x,
						"map_y": map_y,
						"infoName": this.trainUnit,
						"owner": "player"
					});
					app.field.units.push(un);
					text_messages.push(new TextMessage("Ready for war!", app.field.tiles[map_x][map_y].x, app.field.tiles[map_x][map_y].y, 3000, g_rgba(255, 255, 0, 255)));
					this.training = false;
				} else {
					text_messages.push(new TextMessage("Production cells are blocked!", app.field.tiles[this.map_x][this.map_y].x, app.field.tiles[this.map_x][this.map_y].y, 3000, g_rgba(255, 255, 0, 255)));
				}
				
			};
			this.train_timer_tick = function (timer) {
				this.train_count = timer.count;
			};
		};
		this.selected = false;
		this.select = function () {
			this.selected = true;
			if (this.ready_to_collect) {
				this.add_gold();
			};
			if (this.type == "military") {
				if (!this.training) {
					modal = true;
					$("#oncanvas").show();
				} else {
					if (this.unit_ready) {
						this.add_unit();
					}
				}
			}
		};
		this.hovered = false;
		this.hover = function () {
			this.hovered = true;
			this.draw_production_cells();
		};
		this.unhover = function () {
			this.hovered = false;
			this.clear_production_cells();
		};
		this.unselect = function () {
			this.selected = false;
		};
		this.production_cells = [];
		this.draw_production_cells = function () {
			var i,j;
			this.production_cells = [];
			for (i = Math.max(this.map_x - 1,0); i < Math.min(this.map_x + this.size_x + 1, MAP_WIDTH); i++){
				for (j = Math.max(this.map_y - 1,0); j < Math.min(this.map_y + this.size_y + 1, MAP_HEIGHT); j++){
					if ((i != this.map_x - 1 || j != this.map_y - 1) &&
						(i != this.map_x - 1 || j != this.map_y + this.size_y) &&
						(i != this.map_x + this.size_x || j != this.map_y - 1) &&
						(i != this.map_x + this.size_x || j != this.map_y  + this.size_y)){
						if ((walkable[i][j]==0)&&(app.field.tiles[i][j].type == "road")) {
							this.production_cells.push(app.field.tiles[i][j]);
							app.field.tiles[i][j].highlighted = g_rgba(255, 255, 128, 0.5);
						};
					}
				}
			}
		};
		this.calc_production_cells = function () {
			var i,j;
			for (i = Math.max(this.map_x - 1,0); i < Math.min(this.map_x + this.size_x + 1, MAP_WIDTH); i++){
				for (j = Math.max(this.map_y - 1,0); j < Math.min(this.map_y + this.size_y + 1, MAP_HEIGHT); j++){
					if ((i != this.map_x - 1 || j != this.map_y - 1) &&
						(i != this.map_x - 1 || j != this.map_y + this.size_y) &&
						(i != this.map_x + this.size_x || j != this.map_y - 1) &&
						(i != this.map_x + this.size_x || j != this.map_y  + this.size_y)){
						if ((walkable[i][j]==0)&&(app.field.tiles[i][j].type == "road")) {
							this.production_cells.push(app.field.tiles[i][j]);
						};
					}
				}
			}
		};
		this.clear_production_cells = function () {
			for (i=0;i<this.production_cells.length;i++) {
				this.production_cells[i].highlighted = null;
			};
		};
		//units.push(this);
		this.message = function () {
			var result = '';
			if (this.owner == "player") {
				switch (this.type) {
					case 'resource': {
						if (this.ready_to_collect) {
							result = "Ready to collect!"
						} else {
							result = "00:" + (this.collect_timer.max_count - this.collect_timer.count);
						};
						break;
					}
					case "military": {
						//TODO this.unit_ready, unit_train_timer, unit_train_speed
						if (!this.training) {
							result = "Ready for training"
						} else {
							if (this.unit_ready) {
								result = "Unit ready!"
							} else {
								result = "00:" + (this.train_timer.max_count - this.train_timer.count);
							};
						};
						break;
					}
				}
			}
			return this.owner + " " + result;
		}
	};
	
	

	function getCharacterInfo (infoName) {
	  return charactersInfo[infoName];
	}
	
	function Character(instance){
		//Получаем данные экземпляра
		for (var prop in instance) {
			this[prop] = instance[prop]
		};
		//Получаем данные прототипа
		var obj = getCharacterInfo(this.infoName);
		for (var prop in obj) {
			this[prop] = obj[prop]
		};
		this.saveInstance = function() {
			return {
				"id":this.id,
				"hp":this.hp,
				"map_x":this.map_x,
				"map_y":this.map_y,
				"type":this.type,
				"owner":this.owner
			};
		};
		this.image = new Animation(eval(obj["baseImage"]), 60);
		this.animationIdle = eval(obj["baseImage"] + "Idle");
		this.animationAttack = eval(obj["baseImage"] + "Attack");
		this.animationDie = eval(obj["baseImage"] + "Die");

		this.animationMoveRight = "fencer";
		this.animationMoveLeft = "fencer";
		this.animationMoveUp = "fencer";
		this.animationMoveDown = "fencer";

		this.size_x = 1;
		this.size_y = 1;

		walkable[this.map_x][this.map_y] = 1;
		app.field.tiles[this.map_x][this.map_y].unit = this;

		this.x = this.map_x * CELL_SIZE;
		this.y = this.map_y * CELL_SIZE;
		//Переменные движения
		this.move_x = this.x;
		this.move_y = this.y;
		this.step_x = 0;
		this.step_y = 0;
		this.moving = false;
		this.targer_tile = {x:this.map_x, y:this.map_y};
		this.next_tile = {x:this.map_x, y:this.map_y};
		this.current_tile = {x:this.map_x, y:this.map_y};

		var self = this;
		this.toIdle = function  () {
		  self.image = new Animation(self.animationIdle, 60);
		};
		this.dead = false;
		this.death = function () {
			this.dead = true;
			this.image = new AnimationOnce(this.animationDie, 60, function () {
				walkable[self.map_x][self.map_y] = 0;
				app.field.tiles[self.map_x][self.map_y].unit.death();
				app.field.units.splice(app.field.units.indexOf(app.field.tiles[self.map_x][self.map_y].unit), 1);
				delete app.field.tiles[self.map_x][self.map_y].unit;
			})
		};
		this.hovered = false;
		this.hover = function () {
			this.hovered = true;
		};
		this.unhover = function () {
			this.hovered = false;
		};
		this.selected = false;
		this.select = function () {
			this.selected = true;
			this.calc_move_cells(this.map_x, this.map_y);
			this.draw_move_cells();
		}
		this.unselect = function () {
			this.selected = false;
			this.clear_move_cells();
		}
		
		this.path = [];
		this.startMove = function () {
			console.log("start move " + this);
		  //начало движение, убираем выделение
			this.moving = true;
			walkable[this.map_x][this.map_y] = 0;
			walkable[this.target_tile.x][this.target_tile.y] = 1;
			this.startStep();
		};
		this.startStep = function () {
			//Задем целевые координаты для твина, определяем направление
			console.log("start step " + this);
			this.next_tile = this.path.shift(1);
			if (this.next_tile) {
				this.move_x = this.next_tile.x * CELL_SIZE;
				this.move_y = this.next_tile.y * CELL_SIZE;
				var self = this;
				if (Math.round(this.x) != Math.round(this.move_x)) {
					this.tween = new Tween(self, "x", self.move_x, 5, "", self.finishStep);
				} else {
					if (Math.round(this.y) != Math.round(this.move_y)) {
						this.tween = new Tween(self, "y", self.move_y, 5, "", self.finishStep);
					}
				}
			};
		};
		this.finishStep = function () {
		  //Проверяем на конец пути, если не конец, делаем новый твин
  			console.log("finish step ");
			self.current_tile = self.next_tile;
			delete app.field.tiles[self.map_x][self.map_y].unit;
			self.map_x = parseInt((Math.round(self.x)) / CELL_SIZE);
			self.map_y = parseInt((Math.round(self.y)) / CELL_SIZE);
			app.field.tiles[self.map_x][self.map_y].unit = self;
		  	if ((self.current_tile.x != self.target_tile.x) || ((self.current_tile.y != self.target_tile.y))) {
		  		self.startStep();
		  	} else {
		  		self.finishMove();
		  	}
		};
		this.finishMove = function () {
			this.moving = false;
			this.select();
		 	console.log("finish ");
		};
		
		this.makePath = function (tile) {
			//Проверяем на доступность клетки
			if (0 == walkable[tile.x][tile.y]) {
				//делаем путь 
				this.path = new a_star([this.map_x, this.map_y], [tile.x, tile.y], MAP_WIDTH, MAP_HEIGHT);
				//убираем текущую клетку
				this.path.shift(1);
				//проверяем путь по длине
				if (this.path.length <= this.move_range) {
					this.target_tile = tile;
					this.startMove();
				} else {
					this.path = [];
				}
			}
		}; 
		this.move_cells = [];
		this.draw_move_cells = function () {
			for (i=0;i<this.move_cells.length;i++) {
				this.move_cells[i].highlighted = g_rgba(255, 255, 255, 0.5);
			};
		};
		this.clear_move_cells = function () {
			while (this.move_cells.length>0) {//Delete all element of array, after setting highlight to off in app.field.tiles
				this.move_cells.shift(1).highlighted = null;
			}
		};
		this.calc_move_cells = function (target_x, target_y) {
			this.clear_move_cells();
			var i, j;
			for (i = -this.move_range; i <= this.move_range; i++ ) {
				for (j = 0; j <= (this.move_range * 2) - Math.abs(i * 2); j++ ) {
					if 	(((target_x + i >= 0) && (target_x + i < MAP_WIDTH)) && 
					((target_y + j - (this.move_range - Math.abs(i)) >= 0) && 
					(target_y + j - (this.move_range - Math.abs(i)) < MAP_HEIGHT))) {
						var p = new a_star([target_x, target_y], [target_x + i, target_y + j - (this.move_range - Math.abs(i))], MAP_WIDTH, MAP_HEIGHT);
						p.shift(1);
						if ((p.length <= this.move_range)&&(p.length > 0)&&(walkable[target_x + i][target_y + j - (this.move_range - Math.abs(i))]!=1)) {
							this.move_cells.push(app.field.tiles[target_x + i][target_y + j - (this.move_range - Math.abs(i))]);
						};
					};
				};
			};
		};
		this.message = function () {
			return this.owner + ' ' + this.hp + "/" + this.max_hp; 
		};
	};


	function g_rgba(r,g,b,a) {
		return "rgba(" + r + ", " + g + ", " + b + ", " + a +")"
	};

	function g_random(max) {
		return Math.round(Math.random() * max)
	};	
	if ( !window.requestAnimationFrame ) {
		window.requestAnimationFrame = ( function() {
		    return window.webkitRequestAnimationFrame ||
		    window.mozRequestAnimationFrame ||
		    window.oRequestAnimationFrame ||
		    window.msRequestAnimationFrame ||
		    function(callback, element ) {
	      			window.setTimeout(callback, 1000 / 60 );
		    };
 		})();
	}
	
		
	function drawFullrect(x, y, w, h, fill, stroke, width){
		buffer.ctx.save();
		buffer.ctx.translate((x - app.field.offsetX + width), (y - app.field.offsetY + width));
		buffer.ctx.fillStyle = fill;
		buffer.ctx.strokeStyle = stroke;
		buffer.ctx.lineWidth = width;
		//buffer.ctx.lineJoin = "round";
		buffer.ctx.fillRect(0, 0, w-width*2, h-width*2);
		buffer.ctx.strokeRect(0, 0, w-width*2, h-width*2);
		buffer.ctx.restore();
	};	

	function drawFullrectUI(x, y, w, h, fill, stroke, width){
		buffer.ctx.save();
		buffer.ctx.translate((x + width), (y + width));
		buffer.ctx.fillStyle = fill;
		buffer.ctx.strokeStyle = stroke;
		buffer.ctx.lineWidth = width;
		//buffer.ctx.lineJoin = "round";
		buffer.ctx.fillRect(0, 0, w-width*2, h-width*2);
		buffer.ctx.strokeRect(0, 0, w-width*2, h-width*2);
		buffer.ctx.restore();
	};	

	
	function drawText(text, x, y, size, color){
		buffer.ctx.save();
		buffer.ctx.translate((x - app.field.offsetX), (y - app.field.offsetY));
		buffer.ctx.textBaseline = "top";
		buffer.ctx.font = size + "pt Arial";
		buffer.ctx.fillStyle = color;
		buffer.ctx.fillText(text, 0, 0);
		buffer.ctx.restore();
	};

	function drawTextUI(text, x, y, size, color){
		buffer.ctx.save();
		buffer.ctx.translate(x, y);
		buffer.ctx.textBaseline = "top";
		buffer.ctx.font = size + "pt Arial";
		buffer.ctx.fillStyle = color;
		buffer.ctx.fillText(text, 0, 0);
		buffer.ctx.restore();
	};
	
	
	//Зарефакторить на отображение тайлов и зданий
	function drawImage(img, x, y, scale, size_x, size_y, alpha){
		alpha = alpha || 1.0;
		buffer.ctx.globalAlpha = alpha;
		buffer.ctx.save();
		buffer.ctx.translate(x+(CELL_SIZE*(1-scale)/2) - app.field.offsetX, y+(CELL_SIZE*(1-scale)/2) - app.field.offsetY);
		buffer.ctx.scale(scale, scale);
		buffer.ctx.drawImage(img, 0, 0, CELL_SIZE * size_x, CELL_SIZE * size_y);		
		buffer.ctx.restore();
		buffer.ctx.globalAlpha = 1.0;
	};	

	function drawItem(img, x, y, scale){
		buffer.ctx.save();
		buffer.ctx.translate(x - app.field.offsetX, y - app.field.offsetY);
		buffer.ctx.scale(scale, scale);
		buffer.ctx.drawImage(img, 0, 0, CELL_SIZE, CELL_SIZE);		
		buffer.ctx.restore();
	};
	//Main render function, run on timer, that setting in g_start()
	function gameLoop(){
		var tiles = app.field.tiles;
		var units = app.field.units;
		var items = app.field.items;
		var len, i, j;
		fps++;
	    window.requestAnimationFrame(gameLoop);
	    buffer.ctx.save();
	    buffer.ctx.scale(app.zoom, app.zoom);
		var max_i = Math.floor(((app.width + CELL_SIZE + app.field.offsetX) / CELL_SIZE )/ app.zoom) ;
		var max_j = Math.floor(((app.height + CELL_SIZE + app.field.offsetY) / CELL_SIZE) / app.zoom);
		var min_i = Math.floor((app.field.offsetX) / CELL_SIZE);
		var min_j = Math.floor((app.field.offsetY) / CELL_SIZE);
		for (i = min_i; i < max_i; i++) {
			for (j = min_j; j < max_j; j++) {
				if (!tiles[i][j].fog) {
					drawImage(tiles[i][j].tile, i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
					if (tiles[i][j].type) {
						drawImage(tiles[i][j].type, i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
					}
					if (tiles[i][j].selected) {
						drawFullrect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE, g_rgba(255,255,255,0.0), g_rgba(255,255,255,0.8), 4);
					}
					if (tiles[i][j].highlighted) {
						drawFullrect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE, tiles[i][j].highlighted, tiles[i][j].highlighted, 4);
					}
					if (tiles[i][j].hovered) {
						drawFullrect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE, tiles[i][j].hovered, tiles[i][j].hovered, 4);
					}
				} else {
					drawImage(fog, i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
				};
			};
		};
		len = units.length
		for (i = 0; i < len; i++) {
			if (tiles[units[i].map_x][units[i].map_y].fog != 1.0) {
				//if (units[i].moving) {units[i].make_move()};
				if ((units[i].map_x > parseInt((app.field.offsetX) / CELL_SIZE) - units[i].size_x)&&(units[i].map_x < max_i + CELL_SIZE)&&((units[i].map_y > parseInt((app.field.offsetY) / CELL_SIZE) - units[i].size_y)&&(units[i].map_y < max_j + CELL_SIZE))) {
					drawImage(units[i].image.image, units[i].x, units[i].y, 1, units[i].size_x, units[i].size_y);
					if ((units[i].hovered)||(units[i].selected)) {
						drawFullrect(units[i].x, units[i].y, CELL_SIZE * units[i].size_x, 5, g_rgba(255,255,255,0.0), g_rgba(255,255,255,0.8), 0);
						drawFullrect(units[i].x, units[i].y, units[i].hp / units[i].max_hp * CELL_SIZE * units[i].size_x, 5, g_rgba(255,0,0,1.0), g_rgba(255,255,255,0.0), 0);
						drawText(units[i].message(), units[i].x, units[i].y + 5, 8, "white");
					}
				}
			}
		}
		if (ghost_unit) {
			drawImage(ghost_unit.image, ghost_unit.x, ghost_unit.y, 1, ghost_unit.size_x, ghost_unit.size_y, 0.5);
		}
		for (i=0;i<items.length;i++) {
			drawItem(items[i].image, items[i].x, items[i].y, 1);
		}
		buffer.ctx.restore();
		for (i=0;i<text_messages.length;i++) {
			drawText(text_messages[i].text, text_messages[i].x * app.zoom, text_messages[i].y * app.zoom, 12, text_messages[i].color);
		}
		//g_fullrect_ui(0, 485, 730, 600, g_rgba(255,200,125,1.0), g_rgba(255,255,255,0.0), 0);
		//drawFullrectUI(0, 0, 730, 20, g_rgba(255,200,125,1.0), g_rgba(255,255,255,0.0), 0);
		drawTextUI("FPS: " + fps_ui + "  Energy: " + user.energy + " " + user.energy_timer.count + "   Gold: " + user.gold, 20, 4, 8, "black");
		ctx.drawImage(buffer, 0, 0);
	};
	
	function g_fps(){
		$("#fps").text(fps);
		fps=0;
	};

	function generateMap () {
	  var i, j;
		for (i=0;i<MAP_WIDTH;i++) {
			app.field.tiles[i] = [];
			walkable[i] = [];
			for (j=0;j<MAP_HEIGHT;j++) {
				walkable[i][j] = 0;
				var lnd = dirt;
				var lndscp = null;
				rand = g_random(90);
				if (rand < 5) {
					lndscp = forest[g_random(2)];
				}
				if (rand > 5 && rand < 10) {
					lndscp = road;
				}
				if (rand < 2) {
					lndscp = mounts;
					walkable[i][j] = 1;
				}
				var fg = false;
				if ((j>14)||(i>14)) fg = true;
				app.field.tiles[i][j] = {
					x: i * CELL_SIZE, 
					y: j * CELL_SIZE,
					map_x: i,
					map_y: j,
					tile: lnd, 
					type: lndscp, 
					decor: null,
					unit: null, 
					fog: fg, 
					selected: null,
					hovered: null, 
					highlighted: null
				};
			};
		};
	}

	function generateUnits () {
		/*var i, j, an, un;
  		for (i=0;i<MAP_WIDTH - 5;i++) {
			for (j=0;j<MAP_HEIGHT - 5;j++) {
				if (walkable[i][j] == 0) {
					var rnd = g_random(20);
					if ((rnd==13)&&(app.field.tiles[i][j].landscape!="mounts")) {
					    an = new Animation(windmill, 30);
						un = new Building(500, 500, i, j, 1, 1, an, "neutral", "resource", "Windmill");
						player_units.push(un);
					};
					if ((rnd==14)&&(app.field.tiles[i][j].landscape!="mounts")) {
					    an = new Animation([humanHouse], 30000);
						un = new Building(500, 500, i, j, 1, 1, an, "neutral", "house", "House");
						player_units.push(un);
					};
					if ((rnd==20)&&(app.field.tiles[i][j].landscape!="mounts")) {
					    an = new Animation([village], 30000);
						un = new Building(2000, 2000, i, j, 2, 2, an, "neutral", "village", "Village");
						player_units.push(un);
					};
				};
			};
		};*/
		for (var i = 0; i < userBuildings.length; i++){
			if (userBuildings[i].owner == "player") player_units.push(new Building(userBuildings[i]));
			if (userBuildings[i].owner == "neutral") player_units.push(new Building(userBuildings[i]));
			if (userBuildings[i].owner == "enemy") enemy_units.push(new Building(userBuildings[i]));
		}
		for (var i = 0; i < userCharacters.length; i++){
			if (userCharacters[i].owner == "player") player_units.push(new Character(userCharacters[i]));
			if (userCharacters[i].owner == "enemy") enemy_units.push(new Character(userCharacters[i]));
		}
		app.field.units = player_units.concat(enemy_units);
	}

	function g_start () {
		generateMap();
		generateUnits();
		score = 0;
		//clearInterval(timer);
		//timer = setInterval(g_loop, 10);
		clearInterval(framerate);
		framerate = setInterval(g_fps, 1000);
		gameLoop();
	};
	
	function mapMove (x, y) {
		last_x = last_event.clientX - app.canvas.offsetLeft;
		last_y = last_event.clientY - app.canvas.offsetTop;
		if (app.field.offsetX + (last_x - x) < 0) {
			app.field.offsetX = 0;
		} else if (app.field.offsetX + (last_x - x) > MAP_WIDTH * CELL_SIZE - app.width) {
			app.field.offsetX = MAP_WIDTH * CELL_SIZE - app.width;
		} else {
			app.field.offsetX += last_x - x;
		};
		if (app.field.offsetY + (last_y - y) < 0) {
			app.field.offsetY = 0;
		} else if (app.field.offsetY + (last_y - y) > MAP_HEIGHT * CELL_SIZE - app.height) {
			app.field.offsetY = MAP_HEIGHT * CELL_SIZE - app.height;
		} else {
			app.field.offsetY += last_y - y;
		};
	};
	
	function drawGhost (game_x, game_y) {
		ghost_unit.x = game_x * CELL_SIZE;
		ghost_unit.y = game_y * CELL_SIZE;
		
		ghost_unit.rebuild_under_cells(game_x, game_y);
	}
	
	function clearHover(game_x, game_y) {
		if ((last_point.x == -1)||(last_point.y == -1)) {
			last_point.x = game_x;
			last_point.y = game_y;
			return;
		} 
		//Если в предыдущей клетке был юнит, убераем эффекты наведения
		if (app.field.tiles[last_point.x][last_point.y].unit) {
			app.field.tiles[last_point.x][last_point.y].unit.unhover();
			if (hovered_cells) {
				while (hovered_cells.length > 0) {
					hovered_cells.shift(1).hovered = null;
					attacking_units = [];
				};
			};
		};
		app.field.tiles[last_point.x][last_point.y].hovered = null;	
		last_point.x = game_x;
		last_point.y = game_y;
	}
	
	function highlightEnemy(game_x, game_y) {
		var i, j;
		for (i = Math.max(0, game_x - max_range); i < Math.min(game_x + max_range, MAP_WIDTH); i++) {
			for (j = Math.max(0, game_y - max_range); j < Math.min(game_y + max_range, MAP_HEIGHT); j++) {
				if (app.field.tiles[i][j].unit) {
					if (app.field.tiles[i][j].unit.owner == "player") {
						if (app.field.tiles[i][j].unit instanceof Character) {
							if ((Math.abs(game_x - app.field.tiles[i][j].unit.map_x)<=app.field.tiles[i][j].unit.attack_range)&&(Math.abs(game_y - app.field.tiles[i][j].unit.map_y)<=app.field.tiles[i][j].unit.attack_range)) {
								app.field.tiles[i][j].hovered = g_rgba(255,50,50, 0.3);
								hovered_cells.push(app.field.tiles[i][j]);
							};
						};
					};
				};
			};
		};
	};
	
	function checkItemHover (x, y) {
		var result = false
  		for (var i = items.length - 1; i >=0; i--) {
			if (items[i].hit(x, y)) {
				clearHover(last_point.x, last_point.y);
				items[i].hover();
				last_point.x = -1;
				last_point.y = -1;
				return true;
			} 
		}
		return result;
	}
	
	$('#game').mousemove(function (e){
		if (modal) return;
		var x, y, clr, game_x, game_y;
		x = e.clientX - this.offsetLeft;
		y = e.clientY - this.offsetTop;
		if (new Date().getTime() - ticks > 250) {
			drag = true;
		};
		if (drag == true) {
			mapMove(x, y);
			last_event = e;
			return;
		};

		game_x = parseInt(((x + app.field.offsetX * app.zoom) / CELL_SIZE) / app.zoom);
		game_y = parseInt(((y + app.field.offsetY * app.zoom) / CELL_SIZE) / app.zoom);

		//Проверяем на предметы
		if (checkItemHover (x, y)) return;
		//Если мы навели на новую клетку
		if ((last_point.x!=game_x)||(last_point.y!=game_y)) {
			//Очищаем предыдущую клетку
			clearHover(game_x, game_y);
			//Подсвечиваем клетку под мышкой, когда она в зоне ходьбы
			if (selected_unit) {
				if (app.field.tiles[game_x][game_y].highlighted) {
					app.field.tiles[game_x][game_y].hovered = g_rgba(255,255,255, 0.3);
				};
			};
			if (ghost_unit) {
				drawGhost(game_x, game_y);
				return;
			}
			if (app.field.tiles[game_x][game_y].unit) {
				app.field.tiles[game_x][game_y].unit.hover();
				//Подсвечиваем врага и тех кто его может атаковать
				if (app.field.tiles[game_x][game_y].unit.owner=="enemy") {
					highlightEnemy(game_x, game_y);
				};
			};
		};
	});
	
	$('#game').mousedown(function (e){
		if (modal) return;
		var x, y, clr, game_x, game_y;
		
		x = e.clientX - this.offsetLeft;
		y = e.clientY - this.offsetTop;
				
		game_x = parseInt(((x + app.field.offsetX * app.zoom) / CELL_SIZE) / app.zoom);
		game_y = parseInt(((y + app.field.offsetY * app.zoom) / CELL_SIZE) / app.zoom);
		
		last_event = e;	
		
		ticks = new Date().getTime();	
	});
	
	$('#game').mouseup(function (e){
		if (modal) return;
		var x, y, clr, game_x, game_y;
		
		if (drag) {
			drag = false;
			ticks = new Date().getTime()+10000000;
			return;
		}
		drag = false;
		
		ticks = new Date().getTime()+10000000;
		
		x = e.clientX - this.offsetLeft;
		y = e.clientY - this.offsetTop;
		for (i=0;i<items.length;i++) {
			if (items[i].hit(x,y)) {
				items[i].click();
				return;
			} 
		};
		game_x = parseInt(((x + app.field.offsetX * app.zoom) / CELL_SIZE) / app.zoom);
		game_y = parseInt(((y + app.field.offsetY * app.zoom) / CELL_SIZE) / app.zoom);
		
		if (ghost_unit) {
			if (user.consume_energy(app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y) == true){ 
				build = ghost_unit.build(game_x, game_y);
				if (build) {
					app.field.units.push(build)
				} else {
					text_messages.push(new TextMessage("Can't build there!", app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y, 3000, g_rgba(255, 0, 0, 255)));
					return;
				}
				cursor_state = 0;
				ghost_unit = null;
			} else {
				ghost_unit.clear_under_cells();
				cursor_state = 0;
				ghost_unit = null;
			}
			return;
		}
		if (app.field.tiles[game_x][game_y].unit) {//Если мы кликнули на юните
			if (app.field.tiles[game_x][game_y].unit.owner=="player") {//Если это наш юнит
				if (app.field.tiles[game_x][game_y].unit instanceof Character) {//Если это наш персонаж
					if (app.field.tiles[game_x][game_y].unit!=selected_unit) {//Если это наш персонаж и он не выбран
						if (selected_unit) {
							selected_unit.unselect();//Перевыбераем, если до этого у нас был выбран другой юнит
						};
						app.field.tiles[game_x][game_y].unit.select();
						selected_unit = app.field.tiles[game_x][game_y].unit;
					} else {
						selected_unit.unselect();
						selected_unit = null;
					}
				}
				if (app.field.tiles[game_x][game_y].unit instanceof Building) {
					if (app.field.tiles[game_x][game_y].unit!=selected_unit) {
						if (selected_unit) {
							selected_unit.unselect();
						};
						app.field.tiles[game_x][game_y].unit.select();
						selected_unit = app.field.tiles[game_x][game_y].unit;
					} else {
						selected_unit.unselect();
						selected_unit = null;
					}
				}
			}
			if (app.field.tiles[game_x][game_y].unit.owner=="enemy") {
				//Это место должно синхронизироваться с сервером
				if (selected_unit) {
					selected_unit.unselect();
					selected_unit = null;
				};
				while (hovered_cells.length > 0) {
					hovered_cells.shift(1).hovered = null;
					attacking_units = [];
				}
				attack_power = 0;
				for (i = Math.max(0, game_x - max_range); i < Math.min(game_x + max_range, MAP_WIDTH); i++) {
					for (j = Math.max(0, game_y - max_range); j < Math.min(game_y + max_range, MAP_HEIGHT); j++) {
						if (app.field.tiles[i][j].unit) {
							if (app.field.tiles[i][j].unit.owner == "player") {
								if (app.field.tiles[i][j].unit instanceof Character) {
									if ((Math.abs(game_x - app.field.tiles[i][j].unit.map_x)<=app.field.tiles[i][j].unit.attack_range)&&(Math.abs(game_y - app.field.tiles[i][j].unit.map_y)<=app.field.tiles[i][j].unit.attack_range)) {
										app.field.tiles[i][j].hovered = g_rgba(255,50,50, 0.3);
										hovered_cells.push(app.field.tiles[i][j]);
										attacking_units.push(app.field.tiles[i][j].unit);
										attack_power += app.field.tiles[i][j].unit.attack_power;
										var thisUnit = app.field.tiles[i][j].unit; 
										app.field.tiles[i][j].unit.image = new AnimationOnce(app.field.tiles[i][j].unit.animationAttack, 50, app.field.tiles[i][j].unit.toIdle);
									}
								}
							}
						}
					}
				}
				if (attacking_units.length >= 1) {
						if (user.consume_energy(app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y) == true) { 
						//TODO Это место должно синхронизироваться с сервером
						text_messages.push(new TextMessage("-" + attack_power, app.field.tiles[game_x][game_y].unit.x, app.field.tiles[game_x][game_y].unit.y, 1000, g_rgba(255, 0, 0, 255)));
						app.field.tiles[game_x][game_y].unit.hp -= attack_power;
						//Организуем простенький ответ врага
						//app.field.tiles[game_x][game_y].unit
						//Может ли враг ответить! Отвечает только в случае если мы его жахнули
						//if ((Math.abs(game_x - selected_unit.map_x)<=app.field.tiles[game_x][game_y].unit.attack_range)&&(Math.abs(game_y - selected_unit.map_y)<=app.field.tiles[game_x][game_y].unit.attack_range)) {
						//	text_messages.push(new TextMessage("-" + app.field.tiles[game_x][game_y].unit.attack_power, selected_unit.x, selected_unit.y, 1000, g_rgba(255, 0, 0, 255)));
						//	selected_unit.hp -= app.field.tiles[game_x][game_y].unit.attack_power;
						//};
					};
					if (app.field.tiles[game_x][game_y].unit.hp <= 0) {
						app.field.tiles[game_x][game_y].unit.death();
						if (hovered_cells) {
							while (hovered_cells.length > 0) {
								hovered_cells.shift(1).hovered = null;
								attacking_units = [];
							}
						}
					}
					return;
				}
				if (selected_unit) {
					//TODO проверять жив ли противник для контратаки!
					if ((selected_unit instanceof Character)&& (!selected_unit.moving) && (!selected_unit.dead)) {
						if (app.field.tiles[game_x][game_y].unit.hp <= 0) {
							walkable[game_x][game_y] = 0;
							app.field.tiles[game_x][game_y].unit.death();
							app.field.units.splice(app.field.units.indexOf(app.field.tiles[game_x][game_y].unit), 1);
							delete app.field.tiles[game_x][game_y].unit;
						}
						if (selected_unit.hp <= 0) {
							walkable[selected_unit.map_x][selected_unit.map_y] = 0;
							selected_unit.death();
							app.field.units.splice(app.field.units.indexOf(selected_unit), 1);
							delete app.field.tiles[selected_unit.map_x][selected_unit.map_y].unit;
						}
						return;
					};
				};
			};
			if ((app.field.tiles[game_x][game_y].unit.owner=="neutral")&&(app.field.tiles[game_x][game_y].unit.type == "resource")) {
				if (selected_unit) {
					if ((selected_unit instanceof Character)&& (!selected_unit.moving) && (!selected_unit.dead)) {
						if ((Math.abs(game_x - selected_unit.map_x)<=selected_unit.attack_range)&&(Math.abs(game_y - selected_unit.map_y)<=selected_unit.attack_range)) {													
							if (user.consume_energy(app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y) == true){ 
								text_messages.push(new TextMessage("Conquared", app.field.tiles[game_x][game_y].unit.x, app.field.tiles[game_x][game_y].unit.y, 1000, g_rgba(50, 255, 50, 255)));
								app.field.tiles[game_x][game_y].unit.conquered();
							};
						};
					};
				};
			};
		} else {
			if (selected_unit) {
				if ((!selected_unit.moving)&&(selected_unit instanceof Character)) {
					if (app.field.tiles[game_x][game_y].unit == null) {
						//if (eval($.ajax({url: "http://127.0.0.1/move/" + selected_unit.map_x + "/"+ selected_unit.map_y + "/"+ game_x + "/"+ game_y, contentType: 'plain/text', async:false}).responseText)) {
						if (user.consume_energy(app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y) == true){ 
							selected_unit.makePath({x:game_x,y:game_y});
							//Если юнит смог посторить путь - жрем энергию
							user.energy++//Временно возвращаем энергию, если все тип топ, забираем ее назад 
							if (selected_unit.path.length > 0) 	{
								user.consume_energy(app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y);
							}
						}
					};
				};
			};
			if ((selected_unit instanceof Building)&&(app.field.tiles[game_x][game_y].highlighted)) {
				if (user.consume_energy(app.field.tiles[game_x][game_y].x, app.field.tiles[game_x][game_y].y) == true){ 
					var an = new Animation(guard, 60);
					app.field.tiles[game_x][game_y].unit = new Character(120, game_x, game_y, an, "guard", "player", 2);
					app.field.units.push(app.field.tiles[game_x][game_y].unit);
				};
			};
		};
	});
	
	$('#humanHouse').click( function () {
		modal = false;
		$(this).parent().hide();
		ghost_unit = null;
		ghost_unit = new GhostBuilding("humanHouse");
	});
	
	$('#elvenHouse').click( function () {
		modal = false;
		$(this).parent().hide();
		ghost_unit = null;
		ghost_unit = new GhostBuilding("elvenHouse");
	});	
	
	$('#dwarvenHouse').click( function () {
		modal = false;
		$(this).parent().hide();
		ghost_unit = null;
		ghost_unit = new GhostBuilding("dwarvenHouse");
	});	
	
	$('#barracks').click( function () {
		modal = false;
		$(this).parent().hide();
		ghost_unit = null;
		ghost_unit = new GhostBuilding("barracks");
	});
	
	$('#altar').click( function () {
		modal = false;
		$(this).parent().hide();
		ghost_unit = null;
		ghost_unit = new GhostBuilding("altar");
	});
	
	$('#open_map').click( function () {
		for (i=13;i<24;i++) {
			for (j=0;j<15;j++) {
				app.field.tiles[i][j].fog = false;
			}
		}
	});

	$("#normal").click(function () {
		modal = false;
		$(this).parent().hide();
		if (user.gold >= 100) {
			user.gold -= 100;
			selected_unit.set_train_timer(20);
		} else {
			text_messages.push(new TextMessage("Not enough gold!", selected_unit.x, selected_unit.y, 3000, g_rgba(255, 50, 50, 255)));
		}
		selected_unit.unselect();
		selected_unit = null;
	
	});
	
	$("#express").click(function () {
		modal = false;
		$(this).parent().hide();
		if (user.gold >= 200) {
			user.gold -= 200;
			selected_unit.set_train_timer(5);
		} else {
			text_messages.push(new TextMessage("Not enough gold!", selected_unit.x, selected_unit.y, 3000, g_rgba(255, 50, 50, 255)));
		}
		selected_unit.unselect();
		selected_unit = null;
	
	});
	
	$("#instant").click(function () {
		modal = false;
		$("#oncanvas").hide();
		if (user.gold >= 500) {
			user.gold -= 500;
			selected_unit.set_train_timer(0);
		} else {
			text_messages.push(new TextMessage("Not enough gold!", selected_unit.x, selected_unit.y, 3000, g_rgba(255, 50, 50, 255)));
		}
		selected_unit.unselect();
		selected_unit = null;
	
	});
	
	$(".close").click(function () {
		modal = false;
		$(this).parent().hide();
		if (selected_unit) {
			selected_unit.unselect();
			selected_unit = null;
		};
	});	
	
	$("#shopBtn").click(function () {
		modal = true;
		$("#shop").fadeIn("fast");
	})
	$("#zoomin").click(function () {
		if (app.zoom < 1.0) {
			app.zoom += 0.25;
		}
	});
	$("#zoomout").click(function () {
		if (app.zoom > 0.5) {
			app.zoom -= 0.25;
		}
	});
	$("#fullscreen").click(function () {
		app.tempTweenX = new Tween(app.field, "offsetX", 1500, 50, null, function () {
		  app.tempTweenX = null;
		}); 
		app.tempTweenY = new Tween(app.field, "offsetY", 1500, 50, null, function () {
		  app.tempTweenY = null;
		}); 
	});
	$(window).keydown(function (e) {
		if (e.keyCode == 122) {
			app.fullscreen();
		}
	});
	
	$('#new').click( function () {
		app.zoom = 1.0;
		//CELL_SIZE = 72;
		//$("#info").text($.toJSON(units[0].saveInstance()));
		/*		
		app.field.tiles = eval($.ajax({url: "http://127.0.0.1/map", contentType: 'plain/text', async:false}).responseText);
		units = eval($.ajax({url: "http://127.0.0.1/units", contentType: 'plain/text', async:false}).responseText);
		walkable = eval($.ajax({url: "http://127.0.0.1/walkable", contentType: 'plain/text', async:false}).responseText);
		*/
	});
		
	
	if (canvas.getContext) {
		canvas.width = app.width;
		canvas.height = app.height;
		ctx = canvas.getContext('2d');
		buffer = document.createElement("canvas");
		buffer.width = canvas.width;
		buffer.height = canvas.height;
		buffer.ctx = buffer.getContext('2d');
		user = new User("asci", "male");
	} else {
		alert("Canvas not supported by your's browser!");
	};
	g_start ();
});
