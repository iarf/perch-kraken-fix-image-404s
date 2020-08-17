"use strict";
const fs = require("fs");
const sharp = require("sharp");
const mysql = require("mysql");

// set up mysql
const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'sasd_20200814'
});

connection.connect();


// find potentially affected files
const pathArray = fs.readdirSync("./tmp/resources");
let afflictedPaths = new Array();

for (let i = 0; i < pathArray.length; i++){
	if (fs.statSync(pathArray[i]).size < 256){
		afflictedPaths.push(pathArray[i]);
	}
}

console.log(`Checked ${pathArray.length} total files \n
Likely corruption of ${afflictedPaths.length}`);