var fs = require('fs');
var util = require('util');
var request = require('request');
var xml2js = require('xml2js');
var async = require('async');

var parser = new xml2js.Parser();

// Locations of necessary dirs/files.  Change these to match your preferences
var htmlDir = 'html';
var assetsDir = 'assets';
var wordpressXmlFile = 'wordpress.xml';


if(!fs.existsSync(__dirname+'/'+htmlDir)){
    fs.mkdirSync(__dirname+'/'+htmlDir);
}

if(!fs.existsSync(__dirname+'/'+assetsDir)){
    fs.mkdirSync(__dirname+'/'+assetsDir);
}

fs.readFile(__dirname + '/' + wordpressXmlFile, function(err, data){
    parser.parseString(data, function(err, result){
        var content = result.rss.channel[0].item;
        var index = -1;

        async.whilst(
            function() { return ++index < content.length; },
            function(next) {
                var item = content[index];
                if(!item){
                    console.log('for some reason, at index: ' + index + ' there was an undefined item.');
                    next();
                }

                var title = encodeURIComponent(item['title'][0]);
                var url = item['wp:attachment_url'] ? item['wp:attachment_url'][0] : false;
                var postDate = new Date(item['wp:post_date'][0]);
                var htmlPath = __dirname+'/'+htmlDir+'/';
                var imgPath = __dirname+'/'+assetsDir+'/';
                if(url){ // it's an image
                    var temp = url.split('/');
                    var filename = temp[temp.length - 1];

                    if(!fs.existsSync(imgPath+postDate.getFullYear())){
                        fs.mkdirSync(imgPath+postDate.getFullYear());
                    }

                    if(!fs.existsSync(imgPath+postDate.getFullYear()+'/'+(postDate.getUTCMonth()+1))){
                        fs.mkdirSync(imgPath+postDate.getFullYear()+'/'+(postDate.getUTCMonth()+1));   
                    }

                    if(!fs.existsSync(imgPath + filename)){
                        console.log('downloading url ', url);
                        try {
                            request.head(url, function(err, res, body){
                                request(url).pipe(fs.createWriteStream(imgPath+postDate.getFullYear()+'/'+(postDate.getMonth()+1)+'/' + filename)).on('close', function(){
                                    console.log('done downloading ', url);
                                    next();
                                });
                            });
                        } catch(e) {
                                console.log('failed to download ', url);
                        }
                    }else{
                        console.log(imgPath + filename + ' already exists.  Delete it to update.');
                        next();
                    }
                    
                } else { // it's a blog post
                    var htmlDirPath = htmlPath+postDate.getFullYear()+'/'+postDate.getMonth()+'/'+postDate.getDate();

                    if(!fs.existsSync(htmlPath+postDate.getFullYear())){
                        fs.mkdirSync(htmlPath+postDate.getFullYear());
                    }

                    if(!fs.existsSync(htmlPath+postDate.getFullYear()+'/'+postDate.getUTCMonth())){
                        fs.mkdirSync(htmlPath+postDate.getFullYear()+'/'+postDate.getUTCMonth());   
                    }

                    if(!fs.existsSync(htmlDirPath)){
                        fs.mkdirSync(htmlDirPath);
                    }
                         
                    try {   
                        var data = item['content:encoded'][0];
                        while(data.indexOf('[caption id="') >= 0){
                            var startIndex = data.indexOf('[caption id="');
                            var endIndex = data.indexOf('[/caption]') + 10;
                            var substring = data.substring(startIndex, endIndex);

                            var props = { };
                            ['id', 'align', 'width'].forEach(function(property){
                                var tempPropString = substring.substring(substring.indexOf(property+'="')+property.length+2)
                                props[property] = tempPropString.substring(0, tempPropString.indexOf('"'));
                            });

                            if(substring.indexOf('<a') >= 0){
                                props.image = substring.substring(substring.indexOf('<a'), substring.indexOf('</a>')+4);
                                props.caption = substring.substring(substring.indexOf('</a>')+4, substring.indexOf('[/caption]'));

                                var tempUrlSubstring = props.image.substring(props.image.indexOf('href="') + 6);
                                var url = tempUrlSubstring.substring(0, tempUrlSubstring.indexOf('"'));
                                var tempUrlArray = url.split('/');
                                var newUrl = encodeURI('/res/blog-img/'+tempUrlArray[tempUrlArray.length-3]+'/'+tempUrlArray[tempUrlArray.length-2]+'/'+tempUrlArray[tempUrlArray.length-1]);

                                if(url.indexOf('www.cudascubby.com') >= 0){
                                    props.image = props.image.slice(0, props.image.indexOf('href="') + 6) + newUrl + tempUrlSubstring.slice(tempUrlSubstring.indexOf('"'));
                                }
                            } else {
                                props.image = substring.substring(substring.indexOf('<img'), substring.indexOf('/>')+2);
                                props.caption = substring.substring(substring.indexOf('/>')+2, substring.indexOf('[/caption]'));
                            }

                            var tempUrlSubstring = props.image.substring(props.image.indexOf('src="') + 5);
                            var url = tempUrlSubstring.substring(0, tempUrlSubstring.indexOf('"'));
                            var tempUrlArray = url.split('/');
                            var newUrl = encodeURI('/res/blog-img/'+tempUrlArray[tempUrlArray.length-3]+'/'+tempUrlArray[tempUrlArray.length-2]+'/'+tempUrlArray[tempUrlArray.length-1]);

                            if(url.indexOf('www.cudascubby.com') >= 0){
                                props.image = props.image.slice(0, props.image.indexOf('src="') + 5) + newUrl + tempUrlSubstring.slice(tempUrlSubstring.indexOf('"'));
                            }

                            data = data.replace(substring, '');
                            data = data.slice(0, startIndex) + '<div id="'+props.id+'" style="width: '+ props.width +'" class="wp-caption '+props.align+'">'
                                +props.image+'<p>'+props.caption+'</p></div>' + data.slice(startIndex);
                        }

                        item['content:encoded'][0] = data;
                        fs.writeFileSync(htmlDirPath+'/'+title+'.html', data, {flag: 'wx'});
                        console.log('wrote '+htmlDirPath+'/'+title+'.html');
                    } catch (e) {
                        console.log('could not write '+htmlDirPath+'/'+title+'.html' + ' does it already exist?')
                    }

                    next();
                }
            },
            function(err, n){
                console.log('All done!');
            }
        );
    });
});