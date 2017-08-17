'use strict';
(function (window) {
    window.CHART = window.CHART || {};

    /* Default moment formats
     LT: 'h:mm A',
     LTS: 'h:mm:ss A',
     L: 'MM/DD/YYYY',
     l: 'M/D/YYYY',
     LL: 'MMMM Do YYYY',
     ll: 'MMM D YYYY',
     LLL: 'MMMM Do YYYY LT',
     lll: 'MMM D YYYY LT',
     LLLL: 'dddd, MMMM Do YYYY LT',
     llll: 'ddd, MMM D YYYY LT',
     */

    window.CHART.UTILS = (function () {
        var d3 = window.d3,
            $ = window.jQuery;
            var calculateDistance = function(p1,p2){
                var val = (p1.x-p2.x)*(p1.x-p2.x)+(p1.y-p2.y)*(p1.y-p2.y)
                return Math.sqrt(val);
            };

            var toHex = function(n) {
               n = parseInt(n,10);
               if (isNaN(n)) return "00";
               n = Math.max(0,Math.min(n,255));
               return "0123456789ABCDEF".charAt((n-n%16)/16)
                    + "0123456789ABCDEF".charAt(n%16);
              };

            var rgbToHex = function(R,G,B) {return toHex(R)+toHex(G)+toHex(B)};

            var getRGBComponents = function (color) {
                var r = color.substring(1, 3);
                var g = color.substring(3, 5);
                var b = color.substring(5, 7);
                return {
                    R: parseInt(r, 16),
                    G: parseInt(g, 16),
                    B: parseInt(b, 16)
                };
            };
            var getPeopleDataByName = function(name, data){
              var result = data.filter(function(d){
                return d.customer_name===name;
              });
              return result[0];
            };

        return {
            getGrayScale:function(color){
              var components = getRGBComponents(color); 
              var grey = (components.R + components.G + components.B )/3;
              var c = "#"+rgbToHex(grey,grey,grey);
              return c;
            },
            getTimeByIndex:function(start, end, index, width, minWidth){
              var timeInterval = 86400000;
              var buckets = d3.time.day.range(start,end);
              var tickLen = Math.round((buckets.length*minWidth)/width)* timeInterval;
              return start+index*tickLen;              
            },
            getTimeIndexByTick:function(start, end, time,width, minWidth){
              var timeInterval = 86400000;
              var buckets = d3.time.day.range(start,end);
              var tickLen = Math.round((buckets.length*minWidth)/width)* timeInterval;
              var timeIndex = Math.floor((time-start)/tickLen);
              return timeIndex;
            },
            getTimeTicks:function(start, end, width, minWidth){
              var buckets = d3.time.day.range(start,end);
              var tickLen =Math.max(1,Math.round((buckets.length*minWidth)/width));
              var tickCnt = buckets.length/tickLen;
              var ticks = [];
              for(var i=0;i<=tickCnt;i+=1){
                  //var t = start_time+tickLen*timeInterval*i;
                  ticks.push(i);
              }
              return ticks;
            },
            groupTranArrayByPeople:function(tranArray, peopleData){
              var peopleArray = {};
              var result = [];
              tranArray.forEach(function(t){
                if(!peopleArray[t.customer_name]){
                  peopleArray[t.customer_name] = [t];
                }else{
                  peopleArray[t.customer_name].push(t);
                }
              });
              var keys = Object.keys(peopleArray);
              if(peopleData){
                keys.sort(function(a,b){
                  var p_a = getPeopleDataByName(a,peopleData);
                  var p_b = getPeopleDataByName(b,peopleData);
                  var first_sus_a = p_a.suspectTran[0].timeStamp;
                  var first_sus_b = p_b.suspectTran[0].timeStamp;
                  return first_sus_a- first_sus_b;
                  //var suspect_a = p_a.
                });
              }
              keys.forEach(function(k){
                result.push(peopleArray[k]);
              });              
              return result;
            },
            groupTranByPeople:function(store, isFraud){
              var peopleArray = {};
              var resultArray = [];
              var tranArray = isFraud?store.tran:store.suspectTran;
              tranArray.forEach(function(t){
                if(!peopleArray[t.customer_id]){
                  peopleArray[t.customer_id] = [t];
                }else{
                  peopleArray[t.customer_id].push(t);
                }
              });

              var keys = Object.keys(peopleArray);
              keys.sort(function(a,b){
                return peopleArray[a].length-peopleArray[b].length;
              });
              keys.forEach(function(k){
                peopleArray[k].forEach(function(t){
                  resultArray.push(t);
                });
              });
              if(isFraud){
                store.tran = resultArray;
                store.tranByPeople = peopleArray;
              }else{
                store.suspectTranByPeople = peopleArray;
                store.suspectTran = resultArray;
              }
              //return resultArray;

            },
            generateConnectPath:function(x,y, array, isLeft,labelWidth, areaTopY){
              var bottomPosY = d3.max(array, function(d){
                return d.y+d.cellHeight+(areaTopY||0);
              });
              var topPosY = d3.min(array, function(d){
                return d.y+(areaTopY||0);
              });
              var xpos = isLeft?array[0].x:(array[0].x+array[0].cellWidth);
              xpos+=labelWidth;
              var result =  [[xpos,topPosY],[x,y],[xpos,bottomPosY]];
              return result;

            },
          wrapSVGText:function(text, width, lineNum){
            var lineNumber = 0;
            text.each(function() {
              var text = d3.select(this),
                  words = text.text().split(/\s+/).reverse(),
                  word,
                  line = [],
                  //lineNumber = 0,
                  y = Number(text.attr("y")),
                  dy = parseFloat(text.attr("dy")),
                  size =parseFloat(text.style("font-size")),
                  tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y)
                  .attr('class','rowlabel row'+line.length);

                  var lineHeight=Number(size)*0.68;
              while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                //var tt=tspan.node().getComputedTextLength();
                if (tspan.node().getComputedTextLength() > width && line.length>1) {
                  if(!lineNum||(lineNum&&lineNum>=line.length)){
                    var t=++lineNumber*lineHeight+y;
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr('class','rowlabel row'+line.length)
                    .attr("x", 0).attr("y", ++lineNumber*lineHeight+y)
                    .text(word);                    
                  }

                }
              }
            });
            return lineNumber;
        }            
        };
    })();
})(window);

/*
var timeformat = d3.time.format("%b %d %Y")
function getTicks(chart, min, max){
    var chartHeight = 220;
    var tickSize=(chartHeight/nv.tickNumHeight);
    var scale = d3.scale.linear().domain([min,max]);
    var ticks=scale.ticks(tickSize);
    var len1=ticks.length;
    var maxTick=0;
    if(len1>1){
        maxTick=ticks[len1-1]*2-ticks[len1-2];
        if(maxTick!=0 && maxTick){
          ticks.push(maxTick);
        }
        if(ticks[0]>min){
          var minticks=ticks[0]-(ticks[len1-1]-ticks[len1-2]);
          ticks.splice(0, 0, minticks);
        }
    }
    return ticks;
}

function formatBigValue(val, needInt) {
    var f = (val < 1000 || needInt) ? d3.format('1f') : d3.format('.1f');
    var prefix = d3.formatPrefix(val);
    var symbol = prefix.symbol === 'G' ? 'B' : prefix.symbol;
    var t = f(prefix.scale(val));
    return f(prefix.scale(val)) + symbol;
}

function getRGBComponents (color) {
        var r = color.substring(1, 3);
        var g = color.substring(3, 5);
        var b = color.substring(5, 7);
        return {
            R: parseInt(r, 16),
            G: parseInt(g, 16),
            B: parseInt(b, 16)
        };
}


function idealTextColor (bgColor) {
        var nThreshold = 105;
        var components = getRGBComponents(bgColor);
        var bgDelta = (components.R * 0.299) + (components.G * 0.587) + (components.B * 0.114);
        return ((255 - bgDelta) < nThreshold) ? "#000000" : "#ffffff";
}

function getGrayScale(color){
        var components = getRGBComponents(color); 
        var grey = (components.R + components.G + components.B )/3;
        var c = "#"+rgbToHex(grey,grey,grey);
        return c;
}

function rgbToHex(R,G,B) {return toHex(R)+toHex(G)+toHex(B)}
function toHex(n) {
     n = parseInt(n,10);
     if (isNaN(n)) return "00";
     n = Math.max(0,Math.min(n,255));
     return "0123456789ABCDEF".charAt((n-n%16)/16)
          + "0123456789ABCDEF".charAt(n%16);
}*/

/* Since the IE browser (v10 & above) does not support the foreign object, 
     the wrap function is manually done with SVG function. The function splits 
     the SVG text into words vector and wraps them into lines within the constrained width.
     */
function wrapSVGText(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          y = Number(text.attr("y")),
          dy = parseFloat(text.attr("dy")),
          size =parseFloat(text.style("font-size")),
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y)

          var lineHeight=Number(size)*0.68;
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        //var tt=tspan.node().getComputedTextLength();
        if (tspan.node().getComputedTextLength() > width && line.length>1) {
          var t=++lineNumber*lineHeight+y;
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", ++lineNumber*lineHeight+y)
          .text(word);
        }
      }
    });
}

