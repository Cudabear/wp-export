This is a node script designed to utalize the XML export/import script from a wordpress site to pull down all of the assets and posts from that website and cache them on the local machine.  

To use the script, add your wordpress XML export file in the local directory as ```wordpress.xml``` and run ```npm install``` and ```node import.js```.  

This will create an ```assets``` directory, where images are downloaded and stored, and an ```html``` directory, where the pre-existing html that already exists in the XML file is parsed out and packaged up in nice html files.

If you wish to configure how this script executes, change the 3 variables near the top of the file: ```htmlDir```, ```assetsDir```, and ```wordpressXmlFile```.  The XML file must exist in some directory at the level of or under this project.