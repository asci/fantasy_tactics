function Application () {
		if ( typeof Application.instance === Object) {
			return Application.instance;
		}
		
		this.width = 730;
		this.height = 600;

		var canvas = $('#game')[0];
		canvas.width = this.width;
 		canvas.height = this.height;

		this.ctx = canvas.getContext("2d") 		
		this.buffer = document.createElement("canvas");
		this.buffer.width = canvas.width;
		this.buffer.height = canvas.height;
		this.buffer.ctx = buffer.getContext('2d');
		
		this.lastMouseEvent = null;
		this.cursorState = null;
		this.turn = true;
		this.drag = false;
		this.ticks = new Date();
		
		Application.instance = this;
	}
	
function Field () {
	  this.offsetX = 0;
	  this.offsetY = 0;
	  this.mapSizeX = 49;
	  this.mapSizeY = 49;
	  this.tiles = [];
	  this.units = [];
	  this.items = [];
	  this.selectedUnit = null;
	  this.ghostUnit = null;
	  this.attakingUnits = [];
	}
	
function TextMessage(text, x, y, duration, color) {
	this.text = text;
	this.x = x;
	this.y = y;
	this.duration = duration;
	this.color = color;
	this.destr = function () {
		text_messages.splice(text_messages.indexOf(this), 1);
	}
	var self = this;
	setTimeout(function () {
		self.destr();
	}, this.duration);
};

function Timer(interval, count, onInterval, onFinish) {
	this.count = 0;
	this.interval = interval;
	this.max_count = count;
	this.onInterval = onInterval;
	this.onFinish = onFinish;
	var self = this;
	this.count_timer = setInterval(function () {
		if (self.count < self.max_count) {
			self.count++;
			self.onInterval(self);
		} else {
			self.onFinish();
			clearInterval(self.count_timer);
		}
	}, this.interval);
};

function Tile (local_map, open, type, map_x, map_y, decor, landscape) {
	this.local_map = local_map;
	this.open = open;
	this.type = type;
	this.decor = decor;
	this.landscape = landscape;
	this.map_x = map_x;
	this.map_y = map_y;
	this.x = map_x * CELL_SIZE;
	this.y = map_y * CELL_SIZE;
	this.unit = null;
	this.harbor = false;
	this.starting = false;
	this.regeneration = false;
};

function Highlight(x, y, color) {
	this.x = x;
	this.y = y;
	this.color = color;
	highlight_cells.push(this);
	var self = this;
	this.destroy = function () {
		highlight_cells.splice(highlight_cells.indexOf(self), 1);
	};
};

function User (name, sex) {
	var self = this;
	//General
	this.name = name;
	this.sex = sex;
	this.friends = []
	//System
	this.max_energy = 20;
	this.energy_bonus = 0;
	this.energy_timer = new Timer(1000, 10, function (timer) {
		self.update_energy_timer(timer);
	},  function () {
		self.update_energy();
	});
	this.update_energy_timer = function (timer) {
		ui.energy_timer = timer.count;
	};
	this.update_energy = function () {
		//TODO Запрос к серверу
		this.energy++;
		ui.energy = this.energy;
	};
	//Resources:
	this.gold = 1000;
	this.energy = 20;
	this.mandrake_root = 1;
	this.bay_leaf = 1;
	this.medal = 1;
	//Populations
	this.elf_population = 0;
	this.human_population = 100;
	this.dwarf_population = 0;
	//Materials from enemies:
	this.orc_badge = 0;
	this.iron_bar = 0;
	this.leather = 0;
	this.clay = 0;
	this.resin = 0;
	this.cloth = 0;
	this.rope = 0;
	this.brick = 0;
	this.lumber = 0;
	//Collection items from enemies:
	this.apple = 0;
	this.knife = 0;
	this.empty_bottle = 0;
	this.cork = 0;
	this.telescope = 0;
	this.blanket = 0;
	this.copper_shield = 0;
	this.boots = 0;
	this.orc_helmet = 0;
	this.torch = 0;
	this.goloves = 0;
	this.bow = 0;
	this.orc_bracelet = 0;
	this.arrowhead = 0;
	this.leather_pouch = 0;
	this.wood_totem = 0;
	this.orc_wand = 0;
	this.bat_wing = 0;
	this.double_ring = 0;
	this.scroll = 0;
	this.skull_necklace = 0;
	this.bronze_belt = 0;
	this.rusty_kriss = 0;
	this.spiked_hammer = 0;
	this.horn = 0;
	this.skull = 0;
	this.bone = 0;
	this.rusty_sword = 0;
	this.bone_mail = 0;
	this.bone_helmet = 0;
	this.gloves_of_hook = 0;
	this.leather_boots = 0;
	this.bloody_bow = 0;
	this.crow_feather = 0;
	this.chain_pouch = 0;
	this.dark_spell_book = 0;
	this.powder_bag = 0;
	this.thorn_necklace = 0;
	this.hawk_claw = 0;
	this.dark_robe = 0;
	this.bloody_helmet = 0;
	this.flaming_cloak = 0;
	this.scythe = 0;
	this.horseshoe = 0;
	this.spur = 0;
	this.poison_powder = 0;
	this.black_cloak = 0;
	this.rusty_kriss = 0;
	this.shadow_mask = 0;
	this.black_choker = 0;
};