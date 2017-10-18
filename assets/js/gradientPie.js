!function(){
    var gradPie={};

    var pie = d3.layout.pie().sort(null).value(function(d) {return d.percent;});
    var gPie,radius;
    //    var tooltip;

    gradPie.transitioning = false;

    createGradients = function(defs, colors, r){	
        var gradient = defs.selectAll('.gradient')
        .data(colors).enter().append("radialGradient")
        .attr("id", function(d,i){return "gradient" + i;})
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("cx", "0").attr("cy", "0").attr("r", r).attr("spreadMethod", "pad");

        gradient.append("stop").attr("offset", "0%").attr("stop-color", function(d){ return d;});

        gradient.append("stop").attr("offset", "30%")
        .attr("stop-color",function(d){ return d;})
        .attr("stop-opacity", 1);

        gradient.append("stop").attr("offset", "70%")
        .attr("stop-color",function(d){ return "black";})
        .attr("stop-opacity", 1);
    }

    gradPie.draw = function(id, data, cx, cy, r){
        radius = r;
        gPie = d3.select("#"+id).append("g")
        .attr("transform", "translate(" + cx + "," + cy + ")");

        createGradients(gPie.append("defs"), data.map(function(d){ return d.color; }), 2.5*r);

        var paths = gPie.selectAll("path").data(pie(data));
        var arcs =  paths.enter().append("g").attr('class', 'slice');
        var arc_texts = paths.enter().append("g").attr('class', 'slice');
        var arc_labels = paths.enter().append("g").attr('class', 'slice');

        arcs.append("path").attr("fill", function(d,i){ return "url(#gradient"+ i+")";})
        .transition().duration(100).attrTween("d", tweenIn).each("end", function(){
            this._listenToEvents = true;
            gradPie.transitioning = false
        })
        .attr("d", d3.svg.arc().outerRadius(r))
        .attr("id", function(d, i){return 'p' + i;})
        .each(function(d) { this._current = d; });

        arc_texts.append("svg:text")
        .attr("id", function(d, i){return id + '_p' + i;})
        .attr("transform", function(d) {
            var c = d3.svg.arc().outerRadius(r).innerRadius(r / 3).centroid(d);
            return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
        })
        .attr("dy", function(d) {
            if(d.data.percent < 10)
                return '-9999.35em';

            return ".35em";
        })
        .style("text-anchor", "middle")
        .style("fill", "white")
        .style("font", "bold 14px Helvetica")
        .style("opacity", function(d) {
            if(d.data.percent < 10) 
                return '0';

            return '1';
        })
        .text(function(d) { 
            return d.data.percent + "%";
        });

        arc_labels.append("svg:text")
        .attr("id", function(d, i){return id + '_1_p' + i;})
        .attr("transform", function(d) {
            var c = d3.svg.arc().outerRadius(r).innerRadius(r / 3).centroid(d);
            return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
        })
        .attr("dy", function(d) {
            if(d.data.percent < 10)
                return '-9999.35em';

            return  "1.35em";
        })
        .style("text-anchor", "middle")
        .style("fill", "white")
        .style("font", "bold 14px Helvetica")
        .style("opacity", function(d) {
            return '0';
        })  
        .text(function(d) { 
            return d.data.label;
        });

        // Mouse interaction handling
        arcs.on("mouseover", function(d){ 

            // Mouseover effect if no transition has started                
            if(this.childNodes[0]._listenToEvents && !gradPie.transitioning) {

                // Calculate angle bisector
                var ang = d.startAngle + (d.endAngle - d.startAngle)/2; 
                // Transformate to SVG space
                ang = (ang - (Math.PI / 2) ) * -1;

                var tooltipX = Math.cos(ang) * radius * 0.5;
                var tooltipY = Math.sin(ang) * radius * -0.5 + 100;   

                // Calculate a 10% radius displacement
                var x = Math.cos(ang) * radius * 0.1;
                var y = Math.sin(ang) * radius * -0.1;

                d3.select(this).transition()
                .duration(250)
                .attr("transform", function() {
                    return "translate("+x+","+y+")";
                });

                var ele_id = this.childNodes[0].attributes['id'].value;

                d3.select('#'+id+'_'+ele_id)
                .attr("dy", function(d) {
                    return  "0.35em";
                })
                .transition()
                .duration(250)
                .attr("transform", function(d) {
                    var c = d3.svg.arc().outerRadius(r).innerRadius(r / 2).centroid(d);
                    return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
                })
                .style("opacity", function(d) {
                    if(d.value < 10)
                        return "1";
                });

                d3.select('#'+id+'_1_'+ele_id)
                .attr("dy", function(d) {
                    return  "1.35em";
                })
                .transition()
                .duration(250)
                .attr("transform", function(d) {
                    var c = d3.svg.arc().outerRadius(r).innerRadius(r / 2).centroid(d);
                    return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
                })
                .style("opacity", function(d) {
                    return "1";
                });

                if(id=="pie-chart-1") {
                    d3.selectAll(".bc_rect_1:not(#bc_1_" + ele_id + ")")
                    .transition()
                    .duration(250)
                    .style("opacity", "0.5");

                    d3.selectAll("#bc_1_" + ele_id)
                    .transition()
                    .duration(250)
                    .style("opacity", "1");
                }

                if(id=="pie-chart-2") {
                    d3.selectAll(".bc_rect_2:not(#bc_2_" + ele_id + ")")
                    .transition()
                    .duration(250)
                    .style("opacity", "0.5");

                    d3.selectAll("#bc_2_" + ele_id)
                    .transition()
                    .duration(250)
                    .style("opacity", "1");
                }
            }
        })
        .on("mouseout", function(d){

            // Mouseout effect if no transition has started                
            if(this.childNodes[0]._listenToEvents && !gradPie.transitioning){
                d3.select(this).transition()
                .duration(100).attr("transform", "translate(0,0)");

                var ele_id = this.childNodes[0].attributes['id'].value;

                d3.select('#'+id+'_'+ele_id)
                .attr("dy", function(d) {
                    if(d.data.percent < 10)
                        return '-9999.35em';

                    return ".35em";
                })
                .transition()
                .duration(250)
                .attr("transform", function(d) {
                    var c = d3.svg.arc().outerRadius(r).innerRadius(r / 3).centroid(d);
                    return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
                })
                .style("opacity", function(d) {
                    if(d.value < 10)
                        return "0";
                });

                d3.select('#'+id+'_1_'+ele_id)
                .attr("dy", function(d) {
                    if(d.data.percent < 10)
                        return '-9999.35em';

                    return "1.35em";
                })
                .transition()
                .duration(250)
                .attr("transform", function(d) {
                    var c = d3.svg.arc().outerRadius(r).innerRadius(r / 2).centroid(d);
                    return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
                })
                .style("opacity", function(d) {
                    return "0";
                });

                if(id=="pie-chart-1") {
                    d3.selectAll(".bc_rect_1")
                    .transition()
                    .duration(250)
                    .style("opacity", "1");
                }

                if(id=="pie-chart-2") {
                    d3.selectAll(".bc_rect_2")
                    .transition()
                    .duration(250)
                    .style("opacity", "1");
                }
            }
        });

        // Collapse sectors for the exit selection
        paths.exit().transition()
        .duration(1000)
        .attrTween("d", tweenOut).remove();    
    }

    gradPie.transition = function(id, data, r) {

        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return function(t) { return d3.svg.arc().outerRadius(r)(i(t));  };
        }

        if(this._listenToEvents){
            this._listenToEvents = false;
            // Reset inmediatelly
            d3.select(this).attr("transform", "translate(0,0)")
        }

        d3.select("#" + id).selectAll("path").data(pie(data))
        .transition().duration(750).attrTween("d", arcTween)
        .each("end", function(){
            this._listenToEvents = true;
            gradPie.transitioning = false;
        });

        d3.select("#" + id).selectAll("text").data(pie(data))
        .attr("transform", function(d) {
            var c = d3.svg.arc().outerRadius(r).innerRadius(r / 3).centroid(d);
            return "translate(" + (0 + c[0]) + "," + (0 + c[1]) + ")";
        });
    }	

    // "Fold" pie sectors by tweening its current start/end angles
    // into 2*PI
    function tweenOut(data) {
        data.startAngle = data.endAngle = (2 * Math.PI);      
        var interpolation = d3.interpolate(this._current, data);
        this._current = interpolation(0);
        return function(t) {
            return arc(interpolation(t));
        };
    }

    // "Unfold" pie sectors by tweening its start/end angles
    // from 0 into their final calculated values   
    function tweenIn(data) {
        var interpolation = d3.interpolate({startAngle: 0, endAngle: 0}, data);
        this._current = interpolation(0);
        return function(t) {
            return arc(interpolation(t));
        };
    }

    gradPie.pieOn = function(index) {
        var selectedPie = d3.select('#p' + index);
        var d = selectedPie.data()[0];

        // Mouseover effect if no transition has started                
        if(selectedPie[0][0]._listenToEvents && !gradPie.transitioning){
            // Calculate angle bisector
            var ang = d.startAngle + (d.endAngle - d.startAngle)/2; 
            // Transformate to SVG space
            ang = (ang - (Math.PI / 2) ) * -1;

            var tooltipX = Math.cos(ang) * radius * 0.5;
            var tooltipY = Math.sin(ang) * radius * -0.5 + 150;          

            // Calculate a 10% radius displacement
            var x = Math.cos(ang) * radius * 0.1;
            var y = Math.sin(ang) * radius * -0.1;

            selectedPie.transition()
            .duration(250).attr("transform", "translate("+x+","+y+")");

            // tooltip.transition()
            // 	.duration(500)	
            // 	.style("opacity", 0);

            tooltip.transition()
            .duration(200)	
            .style("opacity", .95);

            tooltip.html(
                '<div class="mark" style="background-color:' + d.data.color + '"></div><div class="asset">' +
                d.data.label + ' - ' + d.data.percent + "</div>")
            .style("left", tooltipX + "px")			 
            .style("top", tooltipY + "px");		            
        }
    }

    gradPie.pieOff = function(index) {
        var selectedPie = d3.select('#p' + index);
        var d = selectedPie.data()[0];

        if(selectedPie[0][0]._listenToEvents && !gradPie.transitioning){
            selectedPie.transition()
            .duration(150).attr("transform", "translate(0,0)");

            tooltip.transition()
            .duration(100)	
            .style("opacity", 0);
        }
    }
    this.gradPie = gradPie;
}();
