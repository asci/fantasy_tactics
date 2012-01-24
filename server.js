/*
 * 
 * Turn based social game on HTML5 canvas
 * Server side
 * author: asci
 * e-mail: asci@yandex.ru
 * 
 * --------TODO--------
 * 
 */
var sys = require("util"),
	http = require('http'),
	url = require('url'),
	fs = require('fs'),
	mongo = require('mongodb');

var buildingsInfo = {
	"humanHouse":{
		"max_hp"			:500,
		"sight"				:5,
		"baseImage"			:"humanHouse",
		"type"				:"house",
		"title"				:"Human house",
		"size_x"			:1,
		"size_y"			:1,
		"race"				:"human",
		"populationBonus"	:100,
		"price"				:1000,
		"resellPrice"		:200
	},
	"elvenHouse":{
		"max_hp"			:500,
		"sight"				:5,
		"baseImage"			:"elvenHouse",
		"type"				:"house",
		"title"				:"Elven house",
		"size_x"			:1,
		"size_y"			:1,
		"race"				:"elf",
		"populationBonus"	:100,
		"price"				:1250,
		"resellPrice"		:250
	},
	"windmill":{
		"max_hp"			:500,
		"sight"				:5,
		"baseImage"			:"windmill",
		"type"				:"resource",
		"title"				:"Windmill",
		"size_x"			:1,
		"size_y"			:1,
		"race"				:"human",
		"goldBonus"			:100,
		"collectTime"		:10,
		"price"				:1250,
		"resellPrice"		:250
	},
	"barracks":{
		"max_hp"			:1000,
		"sight"				:3,
		"baseImage"			:"barracks",
		"type"				:"military",
		"title"				:"Fencer barracks",
		"size_x"			:2,
		"size_y"			:2,
		"race"				:"human",
		"trainUnit"			:"fencer",
		"price"				:2000,
		"resellPrice"		:250
	}
}
var userBuildings = [
	{
		"hp"				:500,
		"map_x"				:2,
		"map_y"				:3,
		"owner"				:"player",
		"infoName"			:"humanHouse"
	},
	{
		"hp"				:500,
		"map_x"				:3,
		"map_y"				:3,
		"owner"				:"neutral",
		"infoName"			:"windmill"
	}
]


var charactersInfo = {
		"fencer":{
			"max_hp"			:110,
			"move_range"		:3, 
			"attack_range"		:1, 
			"attack_power"		:10, 
			"sight"				:5,
			"baseImage"			:"fencer"
		},
		"grunt":{
			"max_hp"			:100,
			"move_range"		:3, 
			"attack_range"		:1, 
			"attack_power"		:10, 
			"sight"				:5,
			"baseImage"			:"grunt"
		}, 
		"skeleton":{
			"max_hp"			:60,
			"move_range"		:3, 
			"attack_range"		:1, 
			"attack_power"		:10, 
			"sight"				:5,
			"baseImage"			:"skeleton"
		}
	};
var userCharacters = [
		{
			"id":0,
			"hp":100,
			"map_x":1,
			"map_y":2,
			"infoName":"fencer",
			"owner":"player"
		},
		{
			"id":1,
			"hp":90,
			"map_x":4,
			"map_y":4,
			"infoName":"grunt",
			"owner":"enemy"
		},
		{
			"id":2,
			"hp":60,
			"map_x":5,
			"map_y":3,
			"infoName":"skeleton",
			"owner":"enemy"
		},
		
	];
function inGroupsBy(arr, num) {
	var res = [], tmp = [];
	tmp = arr.slice(0, arr.length);
	while (tmp.length > 0) {
		res.push(tmp.splice(0, num));
	};
	return res;
};

//Game arrays 
var g_map = [];	
	
//Game constants, can be varuable	
	
// Хост и порт берутся из переменных окружения
var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;
var db = new mongo.Db('test', new mongo.Server(host, port, {}), {});



http.createServer(function (req, res) {
	params = req.url.split('/');
	params = params[1].split("?");
	sys.puts(params);
	switch (params[0]) {
	case 'map':
		db.open(function(err, db) {
			db.collection('tiles', function(err, collection) {
				collection.find({}, function(err, cursor) {
					cursor.toArray(function(err, results) {
						g_map = results;
						db.close();
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.write('{"tiles":');
						res.write(JSON.stringify(inGroupsBy(g_map, 24)));
						res.end("}");
					});
				});
			});
			//TODO Разобраться с открытием и закрытием базы
			//Спроектировать БД
		});
		break;
	case 'move':
		map_x = params[2];
		map_y = params[3];
		if (g_map[map_x][map_y].unit) {
			target_x = params[4];
			target_y = params[5];
			var path = [];
			if (0 == walkable[target_x][target_y]) { 
					path = new a_star([map_x, map_y], [target_x, target_y], walkable, MAP_WIDTH, MAP_HEIGHT);
					path.shift(1);
					if (path.length <= g_map[map_x][map_y].unit.move_range) {
						var unit = g_map[map_x][map_y].unit;
						delete g_map[map_x][map_y].unit;
						walkable[map_x][map_y] = 0;
						unit.map_x = target_x;
						unit.map_y = target_y;
						g_map[unit.map_x][unit.map_y].unit = unit;
						g_map[unit.map_x][unit.map_y].fog = 0.0;
						g_map[unit.map_x][unit.map_y].land = "grass";
						walkable[unit.map_x][unit.map_y] = 0;
						res.writeHead(200, {'Content-Type': 'text/plain'});
						res.end(JSON.stringify(true));
					} else {
						res.writeHead(200, {'Content-Type': 'text/plain'});
						res.end(JSON.stringify(false));
					}
			} else {
					res.writeHead(200, {'Content-Type': 'text/plain'});
					res.end(JSON.stringify(false));
			}
		} else {
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end(JSON.stringify(false));
		}
		break;
	case 'users':
		break;
	case 'user_characters':
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(userCharacters));
		break;
	case 'characters_info':
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(charactersInfo));
		break;
	case 'user_buildings':
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(userBuildings));
		break;
	case 'buildings_info':
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(buildingsInfo));
		break;
	default:
		var mimeType = 'text/html';
		switch (req.url.split(".")[req.url.split(".").length - 1]) {
		case "png":
			mimeType = "image";
			break;	
		case "css":
			mimeType = "text/css";
			break;	
		case "js":
			mimeType = "text/javascript";
			break;	
		};
		fs.readFile('.' + req.url, function (err, data) {
			res.writeHead(200, {'Content-Type': mimeType});
			res.end(data);
		});
	}
}).listen(80, "127.0.0.1");

console.log('Server running at http://127.0.0.1/');

