/*
 * 
 * Turn based social game on HTML5 canvas
 * Client side
 * author: asci
 * e-mail: asci@yandex.ru
 * 
 * --------TODO--------
 * 
 * Сделать контроллер загрузки ресурсов
 * Попробовать использовать SocketIO для взаимодействия с клиентом
 * 
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
	var canvas = $('#game')[0],
		ctx, buffer,
		g_map = [],
		hovered_cells = [];
	
	var timer,
		fps = 0, framerate, fps_ui,
		PI = Math.PI,
		drag = false,
		t_mouse,
		ticks,
		MAP_HEIGHT = 47,
		MAP_WIDTH = 47,
		APP_WIDTH = 730,
		APP_HEIGHT = 600,
		f_offset_x = 0,
		f_offset_y = 0,
		last_event,
		last_point = {x:0, y:0},
		response,
		cursor_state = 0,
		modal = false,
		CELL_SIZE = 72;

	var fog = new Image();
		fog.src = "./sprites/fog.png";
	var road = new Image();
		road.src = "./sprites/road.png";
	var mounts = new Image();
		mounts.src = "./sprites/mounts.png";
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
		book.src = "./sprites/book4.png";

	var book_glow = new Image();
		book_glow.src = "./sprites/book4_glow.png";
	//Здания:		
	var grass = AnimationLoader("grass", 3);
	var grassBorder = AnimationLoader("grassBorder", 15);
	var dirt = AnimationLoader("dirt", 3);
	var forest = AnimationLoader("forest", 8);
	
	var altar = AnimationLoader("altar", 4);
	var windmill = AnimationLoader("windmill", 18);
	//Фехтовальщик
	var fencerIdle = AnimationLoader("fencerIdle", 7);
	var fencerAttack = AnimationLoader("fencerAttack", 9);
	var fencerDie = AnimationLoader("fencerDie", 5);
	var fencer = fencerIdle;
	//Орк
	var gruntIdle = AnimationLoader("gruntIdle", 1);
	var gruntAttack = AnimationLoader("gruntAttack", 5);
	var gruntDie = AnimationLoader("gruntDie", 8);
	var grunt = gruntIdle;
	//Скелет
	var skeletonIdle = AnimationLoader("skeletonIdle", 3);
	var skeletonDie = AnimationLoader("skeletonDie", 7);
	var skeletonAttack = AnimationLoader("skeletonAttack", 5);
	var skeleton = skeletonIdle;
	
	function AnimationLoader (name, count) {
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
		
	function g_fullrect(x, y, w, h, fill, stroke, width){
		buffer.ctx.save();
		buffer.ctx.translate((x - f_offset_x + width), (y - f_offset_y + width));
		buffer.ctx.fillStyle = fill;
		buffer.ctx.strokeStyle = stroke;
		buffer.ctx.lineWidth = width;
		//buffer.ctx.lineJoin = "round";
		buffer.ctx.fillRect(0, 0, w-width*2, h-width*2);
		buffer.ctx.strokeRect(0, 0, w-width*2, h-width*2);
		buffer.ctx.restore();
	};	

	function g_fullrect_ui(x, y, w, h, fill, stroke, width){
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

	
	function g_drawtext(text, x, y, size, color){
		buffer.ctx.save();
		buffer.ctx.translate((x - f_offset_x), (y - f_offset_y));
		buffer.ctx.textBaseline = "top";
		buffer.ctx.font = size + "pt Arial";
		buffer.ctx.fillStyle = color;
		buffer.ctx.fillText(text, 0, 0);
		buffer.ctx.restore();
	};

	function g_drawtext_ui(text, x, y, size, color){
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
		buffer.ctx.translate(x+(CELL_SIZE*(1-scale)/2) - f_offset_x, y+(CELL_SIZE*(1-scale)/2) - f_offset_y);
		buffer.ctx.scale(scale, scale);
		buffer.ctx.drawImage(img, 0, 0, CELL_SIZE * size_x, CELL_SIZE * size_y);		
		buffer.ctx.restore();
		buffer.ctx.globalAlpha = 1.0;
	};	

	function g_drawitem(img, x, y, scale){
		buffer.ctx.save();
		buffer.ctx.translate(x - f_offset_x, y - f_offset_y);
		buffer.ctx.scale(scale, scale);
		buffer.ctx.drawImage(img, 0, 0, CELL_SIZE, CELL_SIZE);		
		buffer.ctx.restore();
	};
	//Main render function, run on timer, that setting in g_start()
	function g_loop(){
		fps++;
	    window.requestAnimationFrame(g_loop);
		max_i = parseInt((APP_WIDTH + CELL_SIZE + f_offset_x) / CELL_SIZE);
		max_j = parseInt((APP_HEIGHT + CELL_SIZE + f_offset_y) / CELL_SIZE);
		min_i = parseInt((f_offset_x) / CELL_SIZE);
		min_j = parseInt((f_offset_y) / CELL_SIZE);
		
		for (i = min_i; i < max_i; i++) {
			for (j = min_j; j < max_j; j++) {
				if (!g_map[i][j].fog) {
					drawImage(eval(g_map[i][j].image), i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
					if (g_map[i][j].border) {
						drawImage(g_map[i][j].border, i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
					}
					if (g_map[i][j].decor) {
						drawImage(eval(g_map[i][j].decor), i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
					}
					if (g_map[i][j].selected) {
						g_fullrect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE, g_rgba(255,255,255,0.0), g_rgba(255,255,255,0.8), 4);
					}
					if (g_map[i][j].highlighted) {
						g_fullrect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE, g_map[i][j].highlighted, g_map[i][j].highlighted, 4);
					}
					if (g_map[i][j].hovered) {
						g_fullrect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE, g_map[i][j].hovered, g_map[i][j].hovered, 4);
					}
				} else {
					drawImage(fog, i * CELL_SIZE, j * CELL_SIZE, 1, 1, 1);
				};
			};
		};
		g_fullrect_ui(0, 0, 730, 20, g_rgba(255,200,125,1.0), g_rgba(255,255,255,0.0), 0);
		g_drawtext_ui(	"Cursor: " + cursor_state + " | " + 
						"FPS: " + fps_ui,
						 20, 4, 8, "black");
		ctx.drawImage(buffer, 0, 0);
	};
	
	function g_fps(){
		fps_ui = fps;
		fps=0;
	};

	function generateMap () {
	  var i, j;
		for (i=0;i<MAP_WIDTH;i++) {
			g_map[i] = [];
			for (j=0;j<MAP_HEIGHT;j++) {
				var cc = g_random(2);
				g_map[i][j] = {
					x: i * CELL_SIZE, 
					y: j * CELL_SIZE,
					map_x: i,
					map_y: j,
					image: "grass[" + cc + "]", //for rendering tile image, like grass, dirt, water
					decor: null, //for rendering forest, mounts, road, etc
					type: "grass", //for logic 
					unit: null, 
					fog: false, 
					selected: null,
					hovered: null, 
					highlighted: null
				};
			};
		};
	}

	function g_start () {
		generateMap();
		score = 0;
		clearInterval(framerate);
		framerate = setInterval(g_fps, 1000);
		g_loop();
	};
	
	function mapMove (x, y) {
		last_x = last_event.clientX - canvas.offsetLeft;
		last_y = last_event.clientY - canvas.offsetTop;
		if (f_offset_x + (last_x - x) < 0) {
			f_offset_x = 0;
		} else if (f_offset_x + (last_x - x) > MAP_WIDTH * CELL_SIZE - canvas.width) {
			f_offset_x = MAP_WIDTH * CELL_SIZE - canvas.width;
		} else {
			f_offset_x += last_x - x;
		};
		if (f_offset_y + (last_y - y) < -20) {
			f_offset_y = -20;
		} else if (f_offset_y + (last_y - y) > MAP_HEIGHT * CELL_SIZE - canvas.height) {
			f_offset_y = MAP_HEIGHT * CELL_SIZE - canvas.height;
		} else {
			f_offset_y += last_y - y;
		};
	};
	
	function clearHover(game_x, game_y) {
		if ((last_point.x == -1)||(last_point.y == -1)) {
			last_point.x = game_x;
			last_point.y = game_y;
			return;
		} 
		g_map[last_point.x][last_point.y].hovered = null;	
		last_point.x = game_x;
		last_point.y = game_y;
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
		game_x = parseInt((x + f_offset_x) / CELL_SIZE);
		game_y = parseInt((y + f_offset_y) / CELL_SIZE);
		//Если мы навели на новую клетку
		if ((last_point.x!=game_x)||(last_point.y!=game_y)) {
			//Очищаем предыдущую клетку
			clearHover(game_x, game_y);
			//Подсвечиваем клетку под мышкой, когда она в зоне ходьбы
			g_map[game_x][game_y].hovered = g_rgba(255,255,255, 0.3);
		};
	});
	
	$('#game').mousedown(function (e){
		if (modal) return;
		var x, y, clr, game_x, game_y;
		
		x = e.clientX - this.offsetLeft;
		y = e.clientY - this.offsetTop;
				
		game_x = parseInt((x + f_offset_x) / CELL_SIZE);
		game_y = parseInt((y + f_offset_y) / CELL_SIZE);
		
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

		game_x = parseInt((x + f_offset_x) / CELL_SIZE);
		game_y = parseInt((y + f_offset_y) / CELL_SIZE);
		
		if (cursor_state == 1){
			if (g_map[game_x][game_y].image[0] == "g") {
				g_map[game_x][game_y].image = "dirt[" + g_random(2) + "]";
			} else {
				if  (g_map[game_x][game_y].image[0] == "d") {
					g_map[game_x][game_y].image = "grass[" + g_random(2) + "]";
				}
			}
		}
		if (cursor_state == 2){
			g_map[game_x][game_y].type = "grass"
			g_map[game_x][game_y].decor = null;
		}
		if (cursor_state == 3){
			g_map[game_x][game_y].type = "forest"
			g_map[game_x][game_y].decor = "forest[" + g_random(7) + "]";
		}
		if (cursor_state == 5){
			g_map[game_x][game_y].type = "grass"
			g_map[game_x][game_y].image = "dirt[" + g_random(2) + "]";
			g_map[game_x][game_y].border = grassBorder[curr_bord];
			curr_bord++;
			if (curr_bord == 14) { 
				curr_bord = 0
			}
		}
	});
	curr_bord = 0; //Подъем
	
	$('#new').click( function () {
		$("#info").text($.toJSON(g_map));
	});
	$('#reset').click( function () {
		cursor_state = 0;
	});
	$('#image').click( function () {
		cursor_state = 1;
	});
	$('#type').click( function () {
		cursor_state = 2;
	});
	$('#decor').click( function () {
		cursor_state = 3;
	});
	$('#respawn').click( function () {
		cursor_state = 4;
	});
	$('#border').click( function () {
		cursor_state = 5;
	});
			
	
	if (canvas.getContext) {
		canvas.width = APP_WIDTH;
		canvas.height = APP_HEIGHT;
		ctx = canvas.getContext('2d');
		buffer = document.createElement("canvas");
		buffer.width = canvas.width;
		buffer.height = canvas.height;
		buffer.ctx = buffer.getContext('2d');
	} else {
		alert("Canvas not supported by your's browser!");
	};
	g_start ();
});
