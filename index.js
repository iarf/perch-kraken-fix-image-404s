"use strict";
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const mysql = require("mysql");

// set up mysql
const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : 'root',
	database : 'sasd_fix_20200814',
	port: 8889
});

connection.connect();

main();

async function main(){

	// find potentially affected files
	const pathArray = fs.readdirSync("./tmp/resources");

	const afflictedPaths = await new Promise((resolve,reject)=>{
		let afflictedPaths = new Array();

		for (let i = 0; i < pathArray.length; i++){
			const curFilePath = path.join("./tmp/resources",pathArray[i]);
			if (fs.statSync(curFilePath).size < 256){
				afflictedPaths.push(pathArray[i]);
			}
		}

		console.log(`Checked ${pathArray.length} total files \n
		Likely corruption of ${afflictedPaths.length}\n
		Replacing...`);

		resolve(afflictedPaths);
	});
	
	const corruptDbEntries = await new Promise((resolve,reject)=>{
		let res = new Array();
		for (let i = 0; i < afflictedPaths.length; i++){
			const curPath = afflictedPaths[i];
	
			// find database entry
			// get parent id
			// select parent and child
			// regenerate child from parent
			connection.query(`
			SELECT resourceType, resourceID, resourceParentID, resourceWidth, resourceHeight, resourceMimeType
			FROM perch3_resources
			WHERE resourceFile like '${curPath}';
			`,(err,results,fields)=>{
				if (err) reject(err);
				
				res.push(results[0]);
			});
		}

		resolve(res);

	});

	const goodDbEntries = await new Promise((resolve,reject)=>{
		let res = new Array();
		for (let i = 0; i < corruptDbEntries.length; i++){
			connection.query(`
			SELECT resourceFile
			FROM perch3_resources
			WHERE resourceID like '${corruptDbEntries[i].resourceParentID}';
			`,(err,results,fields)=>{
				if (err) reject(err);

				res.push(results[0]);
			});
		}
		resolve(res);
	});

	for (let i = 0; i < corruptDbEntries.length; i++){
		const pathToResource = path.join('./resources/tmp',corruptDbEntries[i].resourceFile);
		const pathToParent = path.join('./resources/tmp',goodDbEntries[i].resourceFile);

		const desiredHeight = corruptDbEntries[i].resourceHeight;
		const desiredWidth = corruptDbEntries[i].resourceWidth;


		// delete the corrupt file
		fs.unlinkSync(pathToResource);

		let fit;
		if (corruptDbEntries[i].resourceCrop == 1){
			fit = 'cover';
		}else {
			fit = 'inside';
		}

		sharp(pathToParent)
			.resize({
				width: desiredWidth,
				height: desiredHeight,
				fit: fit,
				position: centre
			})
			.toFile(pathToResource, (err) => {
				if (err) throw err;
				// resizing file
			});
	}
}
