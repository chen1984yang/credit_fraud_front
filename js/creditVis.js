var VIS = VIS || {};
VIS.CHART = VIS.CHART || {};
VIS.CHART.WIDGET = VIS.CHART.WIDGET || {};
VIS.CHART.WIDGET.creditVisWidget = function (options) {

    if (!options) throw 'options can not be null';
    else if (options && !options.element) throw 'options.element can not be null';

    var defaultVal = {
        transitionDuration:500,
        margin: { top: 4, right: 4, bottom: 24, left: 24 },
        peopleAreaHeightRate:.2,
        minTickWidth:15,
        dotSize:10,
        numTopFocusLayer:1,
        middleLabelHeight:20,
        rowLabelWidth:70,
        showLabelRowHeight:20,
        yNaviBarWidth:10,
        yNaviBarHeight:30,
        xNaviBarWidth:30,
        xNaviBarHeight:10,
        naviBarRoundCorner:3,
        zoomTickRate:.4,
        timeLabelOffset:9,
        timeFormat:'%m/%d',
        tickTimeFormat:'%d',
        minTickDisplayWidth:15,
        enableTopFisheye:true,
        enableBottomFisheye:true,
        fisheyeZoomRate:2,
        rowLabelMargin:3,
        fraudAmountMarkHeight:5,
        enableWeightedLine:true,
        linkWidthRate:.6,
        tickBarMarginRate:0.1
    };

    function CreditVis(options) {
        var self = this;
        self.d3Ele = d3.select(options.element);
        self.element = options.element;
        self.data = options.data; 
        self.settings = $.extend({}, defaultVal, options);
    }

    CreditVis.prototype = {
        init: function () {
            this._initChart();
           // this._generateChart();
        },
        redraw:function(data){
        },
        resize:function(){
        },
        _initChart:function(){
            var self = this;
          $(self.element).find('[data-id=chartView]').html('');            
            self.chartHeight = $(self.element).find('[data-id=chartView]').height() - self.settings.margin.top - self.settings.margin.bottom;
            self.viewWidth = $(self.element).find('[data-id=chartView]').width() - self.settings.margin.left - self.settings.margin.right;
            self.chartWidth = self.viewWidth - self.settings.rowLabelWidth;

            self.chart =self.d3Ele.select('[data-id=chartView]')
            .append('svg')
            .attr('id','graphView')
            .attr('width', self.viewWidth  + self.settings.margin.left + self.settings.margin.right)
            .attr('height', self.chartHeight + self.settings.margin.top + self.settings.margin.bottom)
            .append('g')
            .attr('transform','translate('+self.settings.margin.left+','+self.settings.margin.top+')');

            self._processTime();
            self.middleAreaHeight = self.chartHeight*self.settings.peopleAreaHeightRate;
            self.topAreaHeight = (self.chartHeight-self.middleAreaHeight)/2;
            self.bottomAreaHeight = (self.chartHeight-self.middleAreaHeight)/2;
            //self.topAreaHeight = self.data.suspectStore.length*(self.chartHeight-self.middleAreaHeight)/(self.data.fraudStore.length+self.data.suspectStore.length);
            //self.bottomAreaHeight = self.data.fraudStore.length*(self.chartHeight-self.middleAreaHeight)/(self.data.fraudStore.length+self.data.suspectStore.length);            
            var maxFraudAmount=  d3.max(self.data.fraudStore, function(d){
                return d.totalFraudAmount;
            });
            self.fraudAmountScale = d3.scale.sqrt().domain([0,maxFraudAmount]).range([0, self.settings.rowLabelWidth*0.8]);
            self.data.suspectStore.forEach(function(s){
                window.CHART.UTILS.groupTranByPeople(s,false);

            });
            self.data.fraudStore.forEach(function(s){
                window.CHART.UTILS.groupTranByPeople(s, true);
            });


            self.data.peopleList.forEach(function(s){
                var minTimeStamp = d3.min(s.fraudTran,function(t){
                    return t.timeStamp;
                });
                s.fraudTran.forEach(function(t){
                    if(t.timeStamp === minTimeStamp){
                        t.bottomFocus = true;
                    }
                    //var minTimeStamp
                });
            });

            self._generateChart();   
        },
        _processTime:function(){
            var self = this;
            var timeInterval = 86400000;
            self.timeTicks = [];
            var timeRange = d3.extent(self.data.links, function(d){
                        return d.timeStamp;
                    });
            var start_time = timeRange[0];
            var end_time = timeRange[1]+timeInterval;
            var minDay = new Date(start_time);
            var maxDay = new Date(end_time);

            var buckets = d3.time.day.range(minDay,maxDay);
            var tickLen = Math.round((buckets.length*self.settings.minTickWidth)/self.chartWidth);
            var tickCnt = buckets.length/tickLen;

            for(var i=0;i<=tickCnt;i+=1){
                self.timeTicks.push(i);
            }
            self.timeScale = d3.scale.ordinal()
                .domain(self.timeTicks)
                .rangeBands([0, self.chartWidth]);
            var tickWidth= Math.floor(self.chartWidth/self.timeTicks.length);
            self.timeScaleFisheye_bottom = d3.fisheye.scale(d3.scale.linear).domain([0, self.timeTicks[(self.timeTicks.length-1)]]).range([0, self.chartWidth]).distortion(0);
            //self.timeScaleFisheye_bottom = d3.fisheye.scale(d3.scale.identity).domain([0, self.chartWidth]).distortion(0);
            //self.timeSteps_bottom =  d3.range(0, self.chartWidth, tickWidth);

            self.timeScaleFisheye_top = d3.fisheye.scale(d3.scale.linear).domain([0, self.timeTicks[(self.timeTicks.length-1)]]).range([0, self.chartWidth]).distortion(0);
            //self.timeSteps =  d3.range(0, self.chartWidth, tickWidth);
            self.timeTickWidth = tickWidth;            

            self.start_time = start_time;
            self.end_time = end_time;
            self.tickLen = tickLen*timeInterval;

        },
        _generateChart:function(){
            var self = this;
            //var topArea = self.chart.append('g').attr('class','topArea');
            //.call(drag);  
            self.chart.append('g').attr('class','middleArea');
            self.chart.append('g').attr('class','topArea');
            self.chart.append('g').attr('class','bottomArea');
            
            self.chart.append('g').attr('class','linkLayer');



            self._generateBottomArea();
            self._generateTopArea();
            self.topNonFocusPos = self.nonFocus_height;

            var drag = d3.behavior.drag()
            .on("drag", function(d,i) {
                d.y += d3.event.dy;
                d.y = Math.max( (0-self.settings.yNaviBarHeight/2) ,Math.min(d.y, (self.nonFocus_height-self.settings.yNaviBarHeight/2)))
                self.topNonFocusPos= (d.y+self.settings.yNaviBarHeight/2);
                self._generateTopArea();
                self._generateLinks();
                d3.select(this).attr("y", function(d,i){
                    return d.y;
                })
            });

            var roundCorner = self.settings.naviBarRoundCorner;

            self.chart.append('rect')
            .datum({y:self.nonFocus_height})
            .attr('class','navBar')
            .attr('x',0-self.settings.yNaviBarWidth)
            .attr('y', self.nonFocus_height-self.settings.yNaviBarHeight/2)
            .attr('width',self.settings.yNaviBarWidth)
            .attr('height',self.settings.yNaviBarHeight)
            .attr('rx',roundCorner)
            .attr('ry',roundCorner)            
            .call(drag);             

                    
            self._generateMidArea();
            self._generateLinks();

            var bottom_drag = d3.behavior.drag()
            .on("drag", function(d,i) {
                d.x += d3.event.dx;
                d.x = Math.max((self.settings.rowLabelWidth-self.settings.xNaviBarWidth/2),Math.min(d.x, (self.settings.rowLabelWidth+self.chartWidth-self.settings.xNaviBarWidth/2)))
                self.bottomFocusPos= d.x;
                self.bottomFocusPos-=self.settings.rowLabelWidth;
                self.timeScaleFisheye_bottom.focus(self.bottomFocusPos).distortion(self.settings.fisheyeZoomRate);
                self._generateBottomArea();
                self._generateLinks();
                d3.select(this).attr("x", function(d,i){
                    return d.x;
                })
            });

            var top_drag = d3.behavior.drag()
            .on("drag", function(d,i) {
                d.x += d3.event.dx;
                d.x = Math.max((self.settings.rowLabelWidth-self.settings.xNaviBarWidth/2),Math.min(d.x, (self.settings.rowLabelWidth+self.chartWidth-self.settings.xNaviBarWidth/2)))
                self.topFocusPos= d.x;
                self.topFocusPos-=self.settings.rowLabelWidth;
                self.timeScaleFisheye_top.focus(self.topFocusPos).distortion(self.settings.fisheyeZoomRate);
                self._generateTopArea();
                self._generateLinks();
                d3.select(this).attr("x", function(d,i){
                    return d.x;
                })
            });            

            self.chart.append('rect')
            .datum({x:self.chartWidth/2})
            .attr('id','bottomZoomBar')
            .attr('class','navBar horizontal')
            .attr('x',self.chartWidth/2)
            .attr('y', ((self.topAreaHeight+self.middleAreaHeight)-self.settings.xNaviBarHeight/2))
            .attr('width',self.settings.xNaviBarWidth)
            .attr('height',self.settings.xNaviBarHeight)
            .attr('display',self.settings.enableBottomFisheye?'block':'none')
            .attr('rx',roundCorner)
            .attr('ry',roundCorner)            
            .call(bottom_drag); 


            self.chart.append('rect')
            .datum({x:self.chartWidth/2})
            .attr('id','topZoomBar')
            .attr('class','navBar horizontal')
            .attr('x',self.chartWidth/2)
            .attr('y', (self.topAreaHeight-self.settings.xNaviBarHeight/2))
            .attr('width',self.settings.xNaviBarWidth)
            .attr('height',self.settings.xNaviBarHeight)
            .attr('display',self.settings.enableTopFisheye?'block':'none')
            .attr('rx',roundCorner)
            .attr('ry',roundCorner)
            .call(top_drag);

        },
        _generateTopArea:function(){
            var self = this;
            //self.chart.selectAll('.topArea').remove();
            var topArea = self.chart.selectAll('.topArea');
            topArea.selectAll('*').remove();
            topArea.append('line').attr('class','areaBorder')
            .attr('x1',self.settings.rowLabelWidth)
            .attr('x2',self.chartWidth+self.settings.rowLabelWidth).attr('y1',self.topAreaHeight).attr('y2',self.topAreaHeight);
            var focus_height = self.settings.numTopFocusLayer*self.bottom_layerHeight;
            var nonFocus_height = self.topAreaHeight- focus_height;
            self.nonFocus_height = nonFocus_height;

            var focusData =[], nonFocusData= [];
            for(var i=0;i<self.data.suspectStore.length;i+=1){
                var store = self.data.suspectStore[i];
                store.index = i;
                if(i<=(self.data.suspectStore.length-1-self.settings.numTopFocusLayer)){
                    nonFocusData.push(store);
                }else{
                    store.topFocus = true;
                    store.suspectTran.forEach(function(t){
                        t.topFocus = true;
                    });
                    focusData.push(store);
                }
            }

            var totalRows_nonFocus = nonFocusData.length;
            var layerHeight_nonFocus = nonFocus_height/totalRows_nonFocus;
            var yFisheye = d3.fisheye.scale(d3.scale.identity).domain([0, nonFocus_height]).distortion(1);
            var ySteps =  d3.range(0, nonFocus_height, layerHeight_nonFocus);
            
            var topNonFocusPos = self.topNonFocusPos===undefined?nonFocus_height:self.topNonFocusPos;
            yFisheye.focus(topNonFocusPos);
            var focusLayerHeight = self.bottom_layerHeight;
           
            topArea.selectAll('.focusLayer').data(focusData).enter()
            .append('g').attr('class','nodeLayer focusLayer').attr('transform',function(d,i){
                var y = i*focusLayerHeight+nonFocus_height;
                d.layer_y = y;
                d.focus = true;
                return 'translate(0,'+y+')';
            });           

            topArea.selectAll('.nonfocusLayer').data(nonFocusData).enter()
            .append('g').attr('class','nodeLayer nonfocusLayer').attr('transform',function(d,i){
                var rowNum = i;
                var y = yFisheye(ySteps[rowNum-1] || 0) + (yFisheye(ySteps[rowNum]) - yFisheye(ySteps[rowNum-1] || 0));
                d.layer_y = y;
                //return 'translate(0,'+ ((self.data.suspectStore.length-i-1)*layerHeight)+')';
                return 'translate(0,'+y+')';
            });

            topArea.selectAll('.focusLayer').each(function(d,i){ 
                var layer= d3.select(this);
                layer.append('rect')
                .attr('class', 'layerBackground')
                //.attr('class', i%2===0?'layerBackground even':'layerBackground odd')
                .attr('width',(self.chartWidth+self.settings.rowLabelWidth))
                .attr('height',focusLayerHeight);
                d.layer_height = focusLayerHeight;
            }); 


            topArea.selectAll('.nonfocusLayer').each(function(d,i){ 
                var layer= d3.select(this);
                var lh = (yFisheye(ySteps[i+1]|| nonFocus_height) - yFisheye(ySteps[i]));
                layer.append('rect').attr('class', i%2===0?'layerBackground even':'layerBackground odd')
                .attr('width',(self.chartWidth+self.settings.rowLabelWidth))
                .attr('height',lh);
                d.layer_height = lh;
            });     
            var nodeLayers = topArea.selectAll('.nodeLayer').each(function(d,i){
                var layer= d3.select(this).append('g')
                .attr('class','layerArea')
                .attr('transform','translate('+self.settings.rowLabelWidth+',0)');

                var labels = d3.select(this).append('g')
                .attr('class','rowLabelArea').call(self._generateRowLabels, self); 
               
                /*
                var tranCells = layer.selectAll('.tranCell').data(d.suspectTran)
                .enter()
                .append('g').attr('class','tranCell');*/
               
            });
            
            //self._positionCellY(nodeLayers,true);
            var zoomTickDict = self._positionCell(nodeLayers,true);

            nodeLayers.each(function(d,i){
                var lh = d.layer_height;
                var tranCells = d3.select(this).selectAll('.tranCell').attr('transform',function(t,i){
                    var y = t.y;
                    t.y +=d.layer_y;
                    return 'translate('+t.x+','+y+')';                
                });

                 tranCells.append('rect')
                 .attr('class', function(t){
                    return t.topFocus? 'tranNode topFocus':'tranNode topContext';
                 })
                 .attr('width',function(d){
                    return d.cellWidth;
                 })
                 /*
                 .attr('y',function(t){
                    var oh =d.focus?tranHeightScale_focus(t.amount): tranHeightScale(t.amount);
                    var h =d.focus?oh: oh*d.layer_height/layerHeight_nonFocus;
                    return 0-h/2;})*/
                 .attr('height',function(t){
                    //var oh =d.focus?tranHeightScale_focus(t.amount): tranHeightScale(t.amount);
                    //var h =d.focus?oh: oh*d.layer_height/layerHeight_nonFocus;
                    return t.cellHeight});                 
            });
            self._generateTickLines(topArea,zoomTickDict,true);

        }, 
        _getLayerTranByTime:function(tran, timeScale){
                var self = this;
                var obj = {};
                tran.forEach(function(d){
                    var timeIndex = Math.floor((d.timeStamp-self.start_time)/self.tickLen);
                    d.timeIndex = timeIndex;

                    var x_start = timeScale(timeIndex);
                    var x_end = timeScale((timeIndex+1))||(self.chartWidth);
                    var dist = Math.floor(x_end-x_start); 
                    var key, subTicks, subTickIndex,start_time,end_time;
                    if(dist<=self.timeTickWidth){
                       key = timeIndex; 
                    }else{
                        var zoomTickWidth = self.settings.minTickWidth*self.settings.zoomTickRate;
                        start_time =  window.CHART.UTILS.getTimeByIndex(self.start_time,self.end_time,d.timeIndex, self.chartWidth,self.settings.minTickWidth);
                        end_time = window.CHART.UTILS.getTimeByIndex(self.start_time,self.end_time,(d.timeIndex+1), self.chartWidth,self.settings.minTickWidth);
                        subTicks = window.CHART.UTILS.getTimeTicks(start_time, end_time,dist, zoomTickWidth);
                        subTickIndex = window.CHART.UTILS.getTimeIndexByTick(start_time, end_time,d.timeStamp,dist, zoomTickWidth);
                        key = timeIndex+'_'+subTickIndex;
                        d.subTickIndex = subTickIndex;
                    }                    

                    //var timeIndex = self._calculateTimeIndex(d.timeStamp, self.start_time, self.tickLen);
                    if(obj[key]){
                        //obj[key].timeIndex = timeIndex;
                        obj[key].tran.push(d);
                        obj[key].total+=d.amount;
                    }else{
                        obj[key]={
                            timeIndex:timeIndex,
                            subTickIndex:subTickIndex,
                            subTicks:subTicks,
                            subTickStartTime:start_time,
                            subTickEndTime:end_time,
                            total:d.amount,
                            tran:[d]
                        }
                    }
                });
                var keys = Object.keys(obj);
                keys.forEach(function(k){
                    obj[k].tranByPeople = window.CHART.UTILS.groupTranArrayByPeople( obj[k].tran);
                });
                return obj;            
        },           
        _positionCell:function(g,isTop){
            var self = this;
            var totalMaxAmount = 0;
            var layerTranByTime =[];
            var zoomTickDict = {};
            var data = isTop? self.data.suspectStore:self.data.fraudStore;
            var timeScale = isTop?self.timeScaleFisheye_top:self.timeScaleFisheye_bottom;


            data.forEach(function(d){
                var tranData = isTop?d.suspectTran:d.tran;
                layerTranByTime.push(self._getLayerTranByTime(tranData, timeScale));
            });

            
            g.each(function(d,i){
                var index = d.index;
                var layerTranTime = layerTranByTime[index];
                var keys = Object.keys(layerTranTime);
                var layerMax = d3.max(keys, function(t){
                    return layerTranTime[t].total;
                });
                totalMaxAmount = Math.max(totalMaxAmount, layerMax);                
            });
            g.each(function(d,i){
                var index = d.index;
                var layerTranTime = layerTranByTime[index];
                var layerHeight =isTop?d.layer_height:self.bottom_layerHeight;
                var heightScale = d3.scale.linear().domain([0,totalMaxAmount]).range([0,layerHeight*0.8]);                

                var keys = Object.keys(layerTranTime);
                var layer = d3.select(this).selectAll('.layerArea');
                keys.forEach(function(k){
                    layer.append('g').datum(layerTranTime[k])
                    .attr('class','tickTran');
                });

                layer.selectAll('.tickTran').each(function(tt){
                    var tranCells = d3.select(this).selectAll('.tranCell').data(tt.tran)
                    .enter().append('g').attr('class','tranCell');
                    var x_start = timeScale(tt.timeIndex);
                    var x_end = timeScale((tt.timeIndex+1))||(self.chartWidth);
                    var dist = Math.floor(x_end-x_start);

                    if(tt.subTickIndex!==undefined){
                        if(!zoomTickDict[tt.timeIndex]){
                            zoomTickDict[tt.timeIndex] = {
                                index:Number(tt.timeIndex),
                                start:tt.subTickStartTime,
                                end:tt.subTickEndTime,
                                start_pos:x_start,
                                end_pos:x_end,
                                ticks:tt.subTicks,
                                dist:dist
                            };
                        }
                    }
                    
                    tranCells.each(function(t){
                         var beforeAmount = 0;
                         var tickIndex = tt.tran.indexOf(t);
                            for(var n=0;n<tickIndex;n+=1){
                                beforeAmount+=tt.tran[n].amount;
                            }                          
                            var h = heightScale(t.amount);
                            var bh = heightScale(beforeAmount);
                            t.cellHeight = h;
                            t.y = layerHeight-(bh+h);

                            var x, tranWidth;
                            if(tt.subTickIndex===undefined){
                                tranWidth =dist*(1-self.settings.tickBarMarginRate);
                                x = x_start+dist*self.settings.tickBarMarginRate/2;                                
                            }else{
                                tranWidth = (1-self.settings.tickBarMarginRate)*dist/tt.subTicks.length;
                                x = x_start+ tt.subTickIndex*(dist/tt.subTicks.length)+ (dist/tt.subTicks.length)*(self.settings.tickBarMarginRate/2);
                            }
                            t.x = x;
                            t.cellWidth = tranWidth;
                    });

                });
            });
            return zoomTickDict;
        },
        _generateTickLines:function(g, zoomTickDict,isTop){
                var self = this;
                var timeScale = isTop?self.timeScaleFisheye_top:self.timeScaleFisheye_bottom;
                 
                 var axisArea = g.append('g').attr('transform','translate('+self.settings.rowLabelWidth+',0)');
                 axisArea.selectAll('.tickLine')
                 .data(self.timeTicks).enter()
                 .append('line')
                 .attr('class','tickLine')
                 .attr('x1',function(d){
                    return timeScale(d);
                 })
                 .attr('x2',function(d){
                    return timeScale(d);
                 })
                 .attr('y1',0)
                 .attr('y2',isTop?self.topAreaHeight:self.bottomAreaHeight);                 

                 var zoomTickKeys = Object.keys(zoomTickDict);
                 axisArea.selectAll('.zoomTickLineArea')
                 .data(zoomTickKeys).enter()
                 .append('g').attr('class','zoomTickLineArea')
                 .attr('transform',function(d){
                    return 'translate('+zoomTickDict[d].start_pos+',0)';
                 }).each(function(d,ki){
                    var tickArea = d3.select(this);
                    var tickObj = zoomTickDict[d];
                    var ticks = zoomTickDict[d].ticks;
                    var tickLen = zoomTickDict[d].dist/ticks.length; 
                    var numTick = Math.ceil(self.settings.minTickDisplayWidth/tickLen);

                    ticks.forEach(function(t,i){
                        
                        tickArea.append('line')
                        .attr('class','zoomTickLine')
                        .attr('x1',i*tickLen)
                        .attr('x2',i*tickLen)
                        .attr('y1',0)
                        .attr('y2',isTop?self.topAreaHeight:self.bottomAreaHeight)
                        .style('stroke-dasharray', ('3, 3'));
                        
                        var zoomTickWidth = self.settings.minTickWidth*self.settings.zoomTickRate;
                        var timeStamp = window.CHART.UTILS.getTimeByIndex(tickObj.start,tickObj.end,t, tickObj.dist,zoomTickWidth);
                        var format = d3.time.format(self.settings.tickTimeFormat);
                        var label = format(new Date(timeStamp));



                        var offset = self.settings.timeLabelOffset;
                        var label = tickArea.append('text')
                        .attr('id','zoomTimeLabel_'+tickObj.index+'_'+i)
                        .attr('class','zoomTimeLabel')
                        .attr('x',i*tickLen+tickLen/2)
                        .attr('y',isTop?(self.topAreaHeight+5): (-2))
                        .attr('dy',isTop?'.35em':'0em')
                        .attr('text-anchor','middle')
                        .attr('display',i%numTick===0?'block':'none')
                        .text(label);

                        if(zoomTickKeys[ki+1]&&Number(zoomTickKeys[ki+1])===(Number(zoomTickKeys[ki])+1)&&i===ticks.length-1 ){
                            label.attr('display','none');
                        }                        
                    });
                 });            
        },
        _generateFraudAmountMark:function(g,self){
                var heightRate = .8;
            g.each(function(d){
                var area = d3.select(this).selectAll('.rowLabelContainer')
                .append('g')
                .attr('class','fraudAmountMarkArea')
                .attr('transform','translate(0,'+(d.layer_height-self.settings.fraudAmountMarkHeight) +')');

                area.append('rect')
                .attr('class','fraudAmountMark')
                .attr('y',self.settings.fraudAmountMarkHeight*(1-heightRate)/2)
                .attr('height',self.settings.fraudAmountMarkHeight*heightRate)
                .attr('width',self.fraudAmountScale(d.totalFraudAmount));

            });
        },
        _generateRowLabels:function(g, self){
            var fontSize = 0.6*self.bottom_layerHeight/2;
            g.each(function(d){

                var labelArea = d3.select(this).append('svg').attr('class','rowLabelContainer')
                .attr('width',self.settings.rowLabelWidth).attr('height',d.layer_height);

                labelArea.append('rect').attr('class','rowLabelBackground')
                .attr('width',self.settings.rowLabelWidth).attr('height',d.layer_height);

                if(d.layer_height<self.settings.showLabelRowHeight){
                    return;
                }

                var labels = labelArea.append('g')
                .attr('transform','translate('+self.settings.rowLabelMargin+',0)')
                .append('text').attr('class','rowLabel')
                .attr('dy','.35em')
                .style('font-size',fontSize)
                .text(d.name);
                var lineNumber = window.CHART.UTILS.wrapSVGText(labels, self.settings.rowLabelWidth,2);
                if(lineNumber===0){
                    labelArea.selectAll('.row0').attr('y',d.layer_height/2||0);
                }else{
                labelArea.selectAll('.row0').attr('y',d.layer_height/4);
                labelArea.selectAll('.row1').attr('y',(d.layer_height/2+d.layer_height/4));                    
                }


            });
        },
        _generateBottomArea:function(){
            var self = this;
            var bottomArea = self.chart.selectAll('.bottomArea')
            .attr('transform','translate(0,'+(self.topAreaHeight+self.middleAreaHeight)+')');
            bottomArea.selectAll('*').remove();
            
            var layerHeight = self.bottomAreaHeight/self.data.fraudStore.length;
            self.bottom_layerHeight = layerHeight;

            var layers = bottomArea.selectAll('.bottomLayer').data(self.data.fraudStore).enter()
            .append('g').attr('class','nodeLayer bottomLayer').attr('transform',function(d,i){
                d.layer_height = layerHeight;
                d.index = i;
                return 'translate(0,'+i*layerHeight+')';
            });

            bottomArea.append('line').attr('class','areaBorder')
            .attr('x1',self.settings.rowLabelWidth)
            .attr('x2',self.chartWidth+self.settings.rowLabelWidth);            

            var xAxis = d3.svg.axis()
            .orient("top")
            .scale(self.timeScaleFisheye_bottom)
            .tickFormat(function(d){
                var timeStamp = window.CHART.UTILS.getTimeByIndex(self.start_time,self.end_time,d, self.chartWidth,self.settings.minTickWidth);
                var format = d3.time.format(self.settings.timeFormat);
                return format(new Date(timeStamp));
            });

            bottomArea.append("g")
            .attr("class", "xaxis")   // give it a class so it can be used to select only xaxis labels  below
            .attr("transform", "translate("+self.settings.rowLabelWidth+",0)")
            .call(xAxis);
            /*
            var layerTranByTime = [];
            self.data.fraudStore.forEach(function(d){
                var layerAggData = self._getLayerTranByTime(d.tran);
                layerTranByTime.push(layerAggData);

            });*/


            layers.each(function(d,i){
                d3.select(this).append('rect').attr('class', i%2===0?'layerBackground even':'layerBackground odd')
                .attr('width',(self.chartWidth+self.settings.rowLabelWidth))
                .attr('height',layerHeight);                
                
                var labels = d3.select(this).append('g')
                .attr('class','rowLabelArea').call(self._generateRowLabels, self);
                d3.select(this).selectAll('.rowLabelArea').call(self._generateFraudAmountMark, self);

                var layer= d3.select(this).append('g')
                .attr('class','layerArea')
                .attr('transform','translate('+self.settings.rowLabelWidth+',0)');
                /*
                layer.selectAll('.tranCell').data(d.tran)
                .enter()
                .append('g').attr('class','tranCell');*/
            });
            
            //self._positionCellY(layers,false);
            var zoomTickDict = self._positionCell(layers,false);

            layers.each(function(d,i){
                var tranCells = d3.select(this).selectAll('.tranCell')
                .attr('transform',function(t){
                    //var y = layerHeight/2+i*layerHeight;
                    //t.y = y;
                    var y = t.y;
                    t.layer = i;
                    t.y+=i*layerHeight;
                    return 'translate('+t.x+','+y+')';                  
                });
                tranCells.append('rect')
                 .attr('class','tranNode')
                 .attr('width',function(d){
                    return d.cellWidth;
                 })
                 .attr('height',function(t){return t.cellHeight});
                 //.attr('y',function(t){return 0-tranHeightScale(t.amount)/2;})
                 //.attr('height',function(t){return tranHeightScale(t.amount)});

            });
            self._generateTickLines(bottomArea,zoomTickDict,false);
        },

        _generateMidArea:function(){
            var self = this;
            var midArea = self.chart.selectAll('.middleArea')
            .attr('transform','translate('+self.settings.rowLabelWidth+','+self.topAreaHeight+')');
            var nodeAreaHeight = self.middleAreaHeight - self.settings.middleLabelHeight;

            midArea.append('rect').attr('class','layerBackground midArea')
            .attr('width',self.chartWidth).attr('height',self.middleAreaHeight);
            var nodes = self.data.peopleList.slice();
            var force = d3.layout.force()
                .on('tick', tick)
                .charge(function(d) {
                  return -30;
                })
                .size([self.chartWidth, self.middleAreaHeight]);

            force
            .nodes(nodes);
            var step = 100;

            var fraudAmountRange = d3.extent(self.data.peopleList,function(d){
                return d.fraudAmount;
            });

            var dotSizeScale = d3.scale.sqrt()
            .domain([0,fraudAmountRange[1]]).range([0,self.settings.dotSize]);


            var midDots = midArea.selectAll('.midDot').data(nodes)
            .enter()
            .append('g')
            .attr('id',function(d){
                return 'midDot'+d.id;
            })
            .attr('class','midDot');
            midDots.append('circle').attr('class','dot')
            .attr('r',function(d){
                d.radius = dotSizeScale(d.fraudAmount);
                return dotSizeScale(d.fraudAmount);
            });            
            var dotSize = self.settings.dotSize;
              force.start();
              for (var i = step * step; i > 0; --i) force.tick();
              force.stop();            
            
            function tick(){
                midDots.attr('transform', function(d){
                    var bottomPos = nodeAreaHeight - dotSize;
                    d.y = Math.max(dotSize, Math.min(bottomPos, d.y));
                    
                    var start_tran = d.suspectTran[0];
                    var end_tran = d.fraudTran[0];
                    var x_center = (self.timeScale(start_tran.timeIndex)+self.timeScale(end_tran.timeIndex))/2;
                    var offSet = dotSize;
                    var x_left = Math.max(dotSize, x_center-offSet);
                    var x_right = Math.min((self.chartWidth-dotSize),(x_center+offSet) );
                    d.x = Math.max(x_left, Math.min(x_right, d.x));

                    var q = d3.geom.quadtree(nodes),
                          i = 0,
                          n = nodes.length;
                    while (++i < n) q.visit(collide(nodes[i]));

                    return 'translate('+d.x+','+d.y+')';
                });
            }

            function collide(node) {
              var r = node.radius,
                  nx1 = node.x - r,
                  nx2 = node.x + r,
                  ny1 = node.y - r,
                  ny2 = node.y + r;
              return function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== node)) {
                  var x = node.x - quad.point.x,
                      y = node.y - quad.point.y,
                      l = Math.sqrt(x * x + y * y),
                      r = node.radius + quad.point.radius;
                  if (l < r) {
                    l = (l - r) / l * .5;
                    node.x -= x *= l;
                    node.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                  }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
              };
            }
        },
        _generateBottomCurveLinks:function(){
            var self = this;
            var linkMaxWidth = self.settings.dotSize*self.settings.linkWidthRate;
            var linkWidthScale = d3.scale.linear().domain([0, self.maxTranAmountBottom]).range([0, linkMaxWidth]);
            var lineFunction = d3.svg.line()
              .x(function(d) { return d[0]; })
              .y(function(d) { return d[1]; })
              //.interpolate('cardinal');
              //.interpolate('basis');
              .interpolate('bundle');

            var lineFunctionCardinal = d3.svg.line()
              .x(function(d) { return d[0]; })
              .y(function(d) { return d[1]; })
              .interpolate('cardinal');

            var tranDistDict = {};
            var linkLayer = self.chart.selectAll('.linkLayer').append('g').attr('class','bottomLinkLayer');

            self.chart.selectAll('.bottomLayer').selectAll('.tickTran')
            .each(function(d,i){
                var tranPeopleList = d.tranByPeople;
                tranPeopleList.forEach(function(l){
                    var groupData = {
                        tran:l,
                    };

                    l.forEach(function(ll){
                        if(ll.bottomFocus){
                            groupData.bottomFocus = true;
                        }
                    });
                    var ypos = 0, totalAmount=0;
                    l.forEach(function(t){
                        ypos+=(t.y+t.cellHeight/2);
                        totalAmount+=t.amount;
                    });
                    ypos = ypos/l.length;    
                    groupData.ypos = ypos;
                    groupData.xpos = l[0].x; 
                    groupData.layer = l[0].layer;               
                    groupData.customer_name = l[0].customer_name;
                    groupData.timeIndex = l[0].timeIndex;
                    linkLayer.append('g').datum(groupData).attr('class','tranLink'); 
                    

                    var parent_elem = l[0];
                    var name= parent_elem.customer_name;
                    var people = self.data.peopleList.filter(function(p){
                        return p.customer_name===name;
                    });
                    var x1 = people[0].x;
                    var firstFraud = people[0].fraudTran[0];
                    var x2 = (x1+firstFraud.x)/2;
                    var y1 = people[0].y;

                            
                    if(!tranDistDict[d.timeIndex]){
                        var obj = {};
                        obj.mid_x = (x2+parent_elem.x)/2;
                        obj.dist = parent_elem.x-x2;
                        obj.points = [x2];
                        tranDistDict[d.timeIndex] = obj;

                    }else{
                        if((parent_elem.x-x2)<tranDistDict[parent_elem.timeIndex].dist){
                            tranDistDict[parent_elem.timeIndex].dist=  parent_elem.x-x2;
                            tranDistDict[parent_elem.timeIndex].mid_x= (x2+parent_elem.x)/2;                            
                        }
                        tranDistDict[d.timeIndex].points.push(x2);
                    }                    
                });
            });
            var keys = Object.keys(tranDistDict);
            keys.forEach(function(k){
                tranDistDict[k].points.sort(function(a,b){
                    return a-b;
                });
            });


            linkLayer.selectAll('.tranLink').each(function(l){
                var parent_elem = l.tran[0];
                var name= l.customer_name;
                var people = self.data.peopleList.filter(function(p){
                    return p.customer_name===name;
                });
                var x1 = people[0].x+self.settings.rowLabelWidth;
                var y1 = people[0].y+self.topAreaHeight; 
                    
                var points, lineGraph;
                if(l.layer<=2){
                        var x2 = l.xpos+self.settings.rowLabelWidth;
                        var y2 = (self.topAreaHeight+self.middleAreaHeight)+l.ypos;
                        points = [[x1,y1],[x1,y2],[x2,y2]];
                        lineGraph = d3.select(this)
                          .append('path')
                          .attr('class',l.bottomFocus?'link bottomFocus':'link bottomContext')
                          .attr('d', lineFunction(points))                          
                          .attr("fill", "none"); 
                }else{
                        var firstFraud = people[0].fraudTran[0];
                        var x2 = (x1+firstFraud.x)/2+self.settings.rowLabelWidth;
                        var y2 = self.chartHeight;


                        var x3 = l.xpos+self.settings.rowLabelWidth;
                        var y3 = (self.topAreaHeight+self.middleAreaHeight)+l.ypos;

                        var distObj= tranDistDict[l.timeIndex];
                        var distScale = d3.scale.linear()
                        .domain([l.xpos,distObj.dist]).range([self.settings.margin.bottom*0.6,self.settings.margin.bottom*0.1]);
                        points = [[x1,y1],[x2,y2]];


                        var x4 = distObj.mid_x;
                        var y4 = distScale((l.xpos-x2))+self.chartHeight;
                        points.push([x4,y4]);
                        points.push([x3,y3]);

                        lineGraph = d3.select(this)
                          .append('path')
                          .attr('class',l.bottomFocus?'link bottomFocus':'link bottomContext')
                          .attr('d', lineFunctionCardinal(points))
                          .attr("fill", "none");

                        if(self.settings.enableWeightedLine){
                            lineGraph.style('stroke-width',linkWidthScale(l.totalAmount)+'px');
                        }      
                }
            });



        },
        _generateTopCurveLinks:function(){
            var self = this;

            var lineFunction = d3.svg.line()
              .x(function(d) { return d[0]; })
              .y(function(d) { return d[1]; })
              //.interpolate('cardinal');
              //.interpolate('basis');
              .interpolate('bundle');

            var linkLayer = self.chart.selectAll('.linkLayer').append('g').attr('class','topLinkLayer');
            self.chart.selectAll('.topArea').selectAll('.tickTran')
            .each(function(d,i){
                var tranPeopleList = d.tranByPeople;
                tranPeopleList.forEach(function(l){
                    var groupData = {
                        tran:l,
                    };
                    
                    l.forEach(function(ll){
                        if(ll.topFocus){
                            groupData.topFocus = true;
                        }
                    });
                    var ypos = 0, totalAmount=0;
                    l.forEach(function(t){
                        ypos+=(t.y+t.cellHeight/2);
                        totalAmount+=t.amount;
                    });
                    ypos = ypos/l.length;    
                    groupData.ypos = ypos;
                    groupData.xpos = l[0].x;
                    groupData.cellWidth = l[0].cellWidth; 
                    groupData.layer = l[0].layer;               
                    groupData.customer_name = l[0].customer_name;
                    groupData.timeIndex = l[0].timeIndex;
                    linkLayer.append('g').datum(groupData).attr('class','tranLink');
            });  

                linkLayer.selectAll('.tranLink').each(function(l){
                    var name= l.customer_name;
                    var people = self.data.peopleList.filter(function(p){
                        return p.customer_name===name;
                    });
                    var x1 = people[0].x+self.settings.rowLabelWidth;
                    var y1 = people[0].y+self.topAreaHeight;      
                    var points; 
                    var x2 = people[0].x>(l.xpos+l.cellWidth)?(l.xpos+l.cellWidth):l.xpos;
                    x2+=self.settings.rowLabelWidth;
                    var y2 = l.ypos;
                    points = [[x1,y1],[x1,y2],[x2,y2]];

                    var lineGraph = d3.select(this)
                          .append('path')
                          .attr('class',l.topFocus?'link topFocus':'link topContext')
                          .attr('d', lineFunction(points))
                          .attr("fill", "none");
                });       

            });
        },
        _generateLinks:function(){
            var self = this;

            var linkLayer = self.chart.selectAll('.linkLayer');
            linkLayer.selectAll('*').remove();
             self._generateBottomCurveLinks();
             self._generateTopCurveLinks();
        },
        toggleTopXFisheye:function(){
            var self = this;
            self.settings.enableTopFisheye = !self.settings.enableTopFisheye
            self.chart.select('#topZoomBar').attr('display',self.settings.enableTopFisheye?'block':'none')
            .attr('x',self.chartWidth/2);

            self.topFocusPos = self.chartWidth/2;
            var fisheyeRate = 0;
            //self.settings.enableTopFisheye?self.settings.fisheyeZoomRate:0;
            self.timeScaleFisheye_top.distortion(fisheyeRate);
            self._generateTopArea();
            self._generateLinks();
        },
        toggleBottomXFisheye:function(){
            var self = this;
            self.settings.enableBottomFisheye = !self.settings.enableBottomFisheye
            self.chart.select('#bottomZoomBar').attr('display',self.settings.enableBottomFisheye?'block':'none');

            self.bottomFocusPos = self.chartWidth/2;
            var fisheyeRate = 0;
            //self.settings.enableBottomFisheye?self.settings.fisheyeZoomRate:0;
            self.timeScaleFisheye_bottom.focus(self.bottomFocusPos).distortion(fisheyeRate);
            self._generateBottomArea();
            self._generateLinks();
        }
    };
    var creditVis = new CreditVis(options);
    creditVis.init();
    return {
        options: creditVis.settings,
        redraw: function () {
            creditVis.redraw.apply(creditVis, arguments);
        },
        resize:function(){
            creditVis.resize.apply(creditVis, arguments);
        },
        toggleBottomXFisheye:function(){
            creditVis.toggleBottomXFisheye.apply(creditVis, arguments);
        },
        toggleTopXFisheye:function(){
            creditVis.toggleTopXFisheye.apply(creditVis, arguments);
        }
    };
};