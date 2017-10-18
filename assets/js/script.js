var revDatas;
var nestBySize;
var nestByColor;
var chart;
var charts;
var revdata;
var all;
var date;
var dates;
var center_lat = null;
var center_lng = null;
var circle_radius = null;
var color_category;
var revGroups;
var revStockids;
var revSizes;
var revColors;
var circle_overlay = null;


d3.select("#remove_map_filter").on('click', function(){
    center_lat = center_lng = null;

    d3.select('#remove_map_filter')
    .style('display', 'none');

    circle_overlay.setMap(null);

    revDataList();
});

d3.json("assets/revdatas.json", function(error, jsonData) {

    revDatas = jsonData.revdatas;

    revGroups = jsonData.groups;
    revStockids = jsonData.stockids;
    revSizes = jsonData.size;
    revColors = jsonData.color;

    // A nest operator, for grouping the revdata list.
    nestBySize = d3.nest()
    .key(function(d) { return d.s; });

    nestByColor = d3.nest().key(function(d) { return d.c});

    // A little coercion, since the CSV is untyped.
    revDatas.forEach(function(d, i) {
        d.index = i;
        d.date = parseDate(d.d);
        d.w = +d.w;
        d.s = +d.s;
        d.c = +d.c;
    });

    // Create the crossfilter for the relevant dimensions and groups.
    revdata = crossfilter(revDatas),
    all = revdata.groupAll(),
    date = revdata.dimension(function(d) { return d.date; }),
    dates = date.group(d3.time.day);

    charts = [

        barChart()
        .dimension(date)
        .group(dates)
        .round(d3.time.day.round)
        .x(d3.time.scale()
            .domain([new Date(2002, 0, 1), new Date(2002, 3, 30)])
            .rangeRound([0, 10 * 90]))
        .filter([new Date(2002, 1, 1), new Date(2002, 2, 1)])

    ];

    // Given our array of charts, which we assume are in the same order as the
    // .chart elements in the DOM, bind the charts to the DOM and render them.
    // We also listen to the chart's brush events to update the display.
    chart = d3.selectAll(".chart")
    .data(charts)
    .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

    revDataList();

    renderAll();

});

// Renders the specified chart or list.
function render(method) {
    d3.select(this).call(method);
}

// Whenever the brush moves, re-rendering everything.
function renderAll() {
    chart.each(render);
}

// Like d3.time.format, but faster.
function parseDate(d) {
    return new Date(2001,
        d.substring(0, 2) - 1,
        d.substring(2, 4),
        d.substring(4, 6),
        d.substring(6, 8));
}

window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
};

window.reset = function(i) {
    charts[i].filter(null);
    renderAll();
    revDataList();
};

function revDataList() {

    var filtered_date = date.top(Infinity);

    if(center_lat) {

        filtered_date = filtered_date.filter(function(d) {

            var thisdata_lat = parseFloat(d.la);
            var thisdata_lng = parseFloat(d.lg);
            var distance = (3958*Math.PI*Math.sqrt((center_lat - thisdata_lat)*(center_lat - thisdata_lat) + Math.cos(center_lat/57.29578)*Math.cos(thisdata_lat/57.29578)*(center_lng-thisdata_lng)*(center_lng-thisdata_lng))/180);

            if(distance <= circle_radius)
                return true;
            else
                return false;

        });
    }

    var revDatasBySize = nestBySize.entries(filtered_date);
    var revDatasByColor = nestByColor.entries(filtered_date);
    color_category = d3.scale.category20();
    var entire_data = filtered_date;

    var entire_wholesale = 0;
    var total_wholesale = [];
    var data = [];

    revDatasBySize.forEach(function(d, j) {

        total_wholesale[j] = 0;

        for(var i=0; i<d.values.length; i++) {
            total_wholesale[j] += parseFloat(d.values[i].w);
        }

        entire_wholesale += total_wholesale[j];

        data.push({
            size: d.key,
            sale: total_wholesale[j]
        })    
    });

    drawBarChart1(data);

    data = [];

    revDatasBySize.forEach(function(d, j) {
        data.push({
            label: revSizes[d.key],
            color: color_category(j),
            percent: parseFloat((total_wholesale[j]/entire_wholesale * 100).toFixed(2))
        });
    });

    d3.select("#pie-chart-1").html('');
    gradPie.draw("pie-chart-1", data, 160, 160, 140);

    data = [];
    total_wholesale = [];
    entire_wholesale = 0;

    revDatasByColor.forEach(function(d, j) {

        total_wholesale[j] = 0;

        for(var i=0; i<d.values.length; i++) {
            total_wholesale[j] += parseFloat(d.values[i].w);
        }

        entire_wholesale += total_wholesale[j];

        data.push({
            color: d.key,
            sale: total_wholesale[j]
        })    
    });

    drawBarChart2(data);

    data = [];

    revDatasByColor.forEach(function(d, j) {
        data.push({
            label: revColors[d.key],
            color: color_category(j),
            percent: parseFloat((total_wholesale[j]/entire_wholesale * 100).toFixed(2))
        });
    });

    d3.select("#pie-chart-2").html('');
    gradPie.draw("pie-chart-2", data, 160, 160, 140);

}

function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 20, left: 10},
    x,
    y = d3.scale.linear().range([100, 0]),
    id = barChart.id++,
    axis = d3.svg.axis().orient("bottom"),
    brush = d3.svg.brush(),
    brushDirty,
    dimension,
    group,
    round;

    function chart(div) {
        var width = x.range()[1],
        height = y.range()[0];

        y.domain([0, group.top(1)[0].value]);

        div.each(function() {
            var div = d3.select(this),
            g = div.select("g");

            // Create the skeletal chart.
            if (g.empty()) {
                div.select(".title").append("a")
                .attr("href", "javascript:reset(" + id + ")")
                .attr("class", "reset")
                .text("reset")
                .style("display", "none");

                g = div.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                g.append("clipPath")
                .attr("id", "clip-" + id)
                .append("rect")
                .attr("width", width)
                .attr("height", height);

                g.selectAll(".bar")
                .data(["background", "foreground"])
                .enter().append("path")
                .attr("class", function(d) { return d + " bar"; })
                .datum(group.all());

                g.selectAll(".foreground.bar")
                .attr("clip-path", "url(#clip-" + id + ")");

                g.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + height + ")")
                .call(axis);

                // Initialize the brush component with pretty resize handles.
                var gBrush = g.append("g").attr("class", "brush").call(brush);
                gBrush.selectAll("rect").attr("height", height);
                gBrush.selectAll(".resize").append("path").attr("d", resizePath);
            }

            // Only redraw the brush if set externally.
            if (brushDirty) {
                brushDirty = false;
                g.selectAll(".brush").call(brush);
                div.select(".title a").style("display", brush.empty() ? "none" : null);
                if (brush.empty()) {
                    g.selectAll("#clip-" + id + " rect")
                    .attr("x", 0)
                    .attr("width", width);
                } else {
                    var extent = brush.extent();
                    g.selectAll("#clip-" + id + " rect")
                    .attr("x", x(extent[0]))
                    .attr("width", x(extent[1]) - x(extent[0]));
                }
            }

            g.selectAll(".bar").attr("d", barPath);
        });

        function barPath(groups) {
            var path = [],
            i = -1,
            n = groups.length,
            d;
            while (++i < n) {
                d = groups[i];
                path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
            }
            return path.join("");
        }

        function resizePath(d) {
            var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
            return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
        }
    }

    brush.on("brushstart.chart", function() {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
        var g = d3.select(this.parentNode),
        extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
            .selectAll(".resize")
            .style("display", null);
        g.select("#clip-" + id + " rect")
        .attr("x", x(extent[0]))
        .attr("width", x(extent[1]) - x(extent[0]));
        dimension.filterRange(extent);

        revDataList();
    });

    brush.on("brushend.chart", function() {
        if (brush.empty()) {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title a").style("display", "none");
            div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
            dimension.filterAll();
        }
    });

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) return x;
        x = _;
        axis.scale(x);
        brush.x(x);
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    chart.dimension = function(_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
    };

    chart.filter = function(_) {
        if (_) {
            brush.extent(_);
            dimension.filterRange(_);
        } else {
            brush.clear();
            dimension.filterAll();
        }
        brushDirty = true;
        return chart;
    };

    chart.group = function(_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
    };

    chart.round = function(_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
    };

    return d3.rebind(chart, brush, "on");
}

// added by topnotch
drawPieChart();
//drawBarChart();

function drawPieChart() {

    var svg = d3.select("svg.pie-chart-1")
    .attr("width", 320)
    .attr("height", 320);

    gradPie.transitioning = true;

    svg.append("g").attr("id","pie-chart-1");

    svg = d3.select("svg.pie-chart-2")
    .attr("width", 320)
    .attr("height", 320);

    gradPie.transitioning = true;

    svg.append("g").attr("id","pie-chart-2");
}

function drawBarChart1(data) {
    var margin = {top: 20, right: 20, bottom: 70, left: 80},
    width = 320 - margin.left - margin.right,
    height = 320 - margin.top - margin.bottom;

    var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);

    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(10);

    var svg = d3.select("svg.bar-chart-1")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .html('')
    .append("g")
    .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")");

    data.forEach(function(d) {
        d.size = d.size;
        d.sale = +d.sale;
    });

    x.domain(data.map(function(d) { return revSizes[d.size]; }));
    y.domain([0, d3.max(data, function(d) { return d.sale; })]);

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.55em")
    .attr("transform", "rotate(-90)" );

    svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Value ($)");

    svg.selectAll("bar")
    .data(data)
    .enter().append("rect")
    .attr("id", function(d, i) {
        return 'bc_1_p'+i;
    })
    .attr("class", 'bc_rect_1')
    .style("fill", function(d, i) {
        return 'steelblue';
    })
    .attr("x", function(d) { return x(d.size); })
    .attr("width", x.rangeBand())
    .attr("y", function(d) { return y(d.sale); })
    .attr("height", function(d) {
        var val = height - y(d.sale);
        if(val<0) val = 0;

        return val;
    });

}

function drawBarChart2(data) {
    var margin = {top: 20, right: 20, bottom: 70, left: 80},
    width = 320 - margin.left - margin.right,
    height = 320 - margin.top - margin.bottom;

    var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);

    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(10);

    var svg = d3.select("svg.bar-chart-2")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .html('')
    .append("g")
    .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")");

    data.forEach(function(d) {
        d.color = d.color;
        d.sale = +d.sale;
    });

    x.domain(data.map(function(d) { return revColors[d.color]; }));
    y.domain([0, d3.max(data, function(d) { return d.sale; })]);

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.55em")
    .attr("transform", "rotate(-90)" );

    svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Value ($)");

    svg.selectAll("bar")
    .data(data)
    .enter().append("rect")
    .attr("id", function(d, i) {
        return 'bc_2_p'+i;
    })
    .attr("class", 'bc_rect_2')
    .style("fill", function(d, i) {
        return 'steelblue';
        //        return color_category(i);
    })
    .attr("x", function(d) { return x(d.color); })
    .attr("width", x.rangeBand())
    .attr("y", function(d) { return y(d.sale); })
    .attr("height", function(d) {
        var val = height - y(d.sale);
        if(val<0) val = 0;

        return val;
    });

}

function initMap() {
    var map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 40.509623, lng: -103.535156},
        zoom: 5
    });

    var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.MARKER,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['circle']
        },
        markerOptions: {icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png'},
        circleOptions: {
            fillColor: '#00ff00',
            fillOpacity: 0.2,
            strokeWeight: 5,
            clickable: false,
            editable: true,
            zIndex: 1
        }
    });

    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {

        if(circle_overlay)
            circle_overlay.setMap(null);

        circle_overlay = event.overlay;

        getEventInfo();

        google.maps.event.addListener(circle_overlay, 'radius_changed', function(event) {
            getEventInfo();
            revDataList();
        });

        google.maps.event.addListener(circle_overlay, 'center_changed', function(event) {
            getEventInfo();
            revDataList();
        });

        d3.select('#remove_map_filter')
        .style('display', 'block');

        revDataList();
        
        drawingManager.setDrawingMode(null);
    });

    /*    var drawing_flag = 0;

    google.maps.event.addDomListener(document.getElementById('map'), 'mousemove', function(event) {
    console.log(event.buttons);

    if(event.buttons == 1 && drawing_flag == 1) {
    console.log("drawing");
    }
    });

    google.maps.event.addDomListener(document.getElementById('map'), 'mouseup', function(event) {
    if(drawing_flag == 1) {
    drawing_flag = 0; 
    }
    });

    google.maps.event.addListener(drawingManager, 'drawingmode_changed', function() {
    if(drawingManager.drawingMode == "circle") {
    drawing_flag = 1;
    return;            
    }

    drawing_flag = 0;
    });*/    
}

function getEventInfo() {

    var center = circle_overlay.getCenter();

    circle_radius = circle_overlay.getRadius() / 1609.344;
    center_lat = center.lat();
    center_lng = center.lng();
}