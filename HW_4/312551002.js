const data_path = "https://raw.githubusercontent.com/AndyChiangSH/1121-data-visualization/refs/heads/main/Homeworks/HW1_Scatter%20Plots/iris.csv";

var size = 200;
var padding = 30;

var x = d3.scaleLinear().range([padding / 2, size - padding / 2]);

var y = d3.scaleLinear().range([size - padding / 2, padding / 2]);

var xAxis = d3.axisBottom().scale(x).ticks(6).tickFormat("");

var yAxis = d3.axisLeft().scale(y).ticks(6).tickFormat("");

var color = d3.scaleOrdinal()
    .domain(["setosa", "versicolor", "virginica"])
    .range(["#ff6347", "#4682b4", "#3cb371"]);

const features = ["sepal length", "sepal width", "petal length", "petal width"];

d3.csv(data_path, function (error, data) {
    if (error) throw error;

    data.splice(150, 1);

    var domainByTrait = {},
        traits = d3.keys(data[0]).filter(function (d) { return d !== "class"; }),
        n = traits.length;

    traits.forEach(function (trait) {
        domainByTrait[trait] = d3.extent(data, function (d) { return d[trait]; });
    });

    xAxis.tickSize(size * n);
    yAxis.tickSize(-size * n);

    var brush = d3.brush()
        .on("start", brushstart)
        .on("brush", brushmove)
        .on("end", brushend)
        .extent([[15, 15], [size - 15, size - 15]]);

    var svg = d3.select("#my_dataviz").append("svg")
        .attr("width", size * n + padding)
        .attr("height", size * n + padding)
        .append("g")
        .attr("transform", "translate(" + padding + "," + padding / 2 + ")");

    var cell = svg.selectAll(".cell")
        .data(cross(traits, traits))
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function (d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
        .each(plot);

    cell.call(brush);

    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    svg.selectAll("circle")
        .on("mouseover", function (d) {
            d3.select(this)
                .transition()
                .duration(300)
                .attr("r", 6)
                .style("fill-opacity", 1)
                .style("stroke", "#000");

            tooltip
                .style("visibility", "visible")
                .html(`<strong>Class:</strong> ${d.class}<br>
                       <strong>Sepal Length:</strong> ${d["sepal length"]}<br>
                       <strong>Sepal Width:</strong> ${d["sepal width"]}`);
        })
        .on("mousemove", function (d) {
            tooltip
                .style("top", (d3.event.pageY - 10) + "px")
                .style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(300)
                .attr("r", 4)
                .style("fill-opacity", 0.7)
                .style("stroke", null);

            tooltip.style("visibility", "hidden");
        });

    svg.selectAll(".legend")
        .on("click", function (classType) {
            var active = !d3.select(this).classed("active");
            d3.select(this).classed("active", active);

            svg.selectAll("circle")
                .filter(function (d) { return d.class === classType; })
                .transition()
                .style("opacity", active ? 0 : 1);
        });

    function plot(p) {
        var cell = d3.select(this);

        x.domain(domainByTrait[p.x]);
        y.domain(domainByTrait[p.y]);

        var position = d3.scalePoint()
            .domain(features)
            .range([0, 1]);

        if (p.x != p.y) {
            var tmp = cell
                .append('g')
                .attr("transform", `translate(${position(p.x) + padding / 2},${position(p.y) + padding / 2})`);

            tmp.append("rect")
                .attr("class", "frame")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", size - padding)
                .attr("height", size - padding);

            var xextent = d3.extent(data, function (d) { return +d[p.x]; });
            var x1 = d3.scaleLinear()
                .domain(xextent)
                .range([padding / 2, size - padding / 2]);

            var yextent = d3.extent(data, function (d) { return +d[p.y]; });
            var y1 = d3.scaleLinear()
                .domain(yextent)
                .range([size - padding / 2, padding / 2]);

            tmp.append("g")
                .attr("transform", `translate(${-padding / 2}, ${size - padding})`)
                .call(d3.axisBottom().scale(x1).ticks(6));

            tmp.append("g")
                .attr("transform", `translate(0, ${-padding / 2})`)
                .call(d3.axisLeft().scale(y1).ticks(6));

            cell.selectAll("circle")
                .data(data)
                .enter().append("circle")
                .attr("cx", function (d) { return x1(d[p.x]); })
                .attr("cy", function (d) { return y1(d[p.y]); })
                .attr("r", 4)
                .style("fill", function (d) { return color(d.class); });
        } else {
            var tmp = cell
                .append('g')
                .attr("transform", `translate(${position(p.x) + padding / 2},${position(p.y) + padding / 2})`);

            var xextent = d3.extent(data, function (d) { return +d[p.x]; });
            var x2 = d3.scaleLinear()
                .domain(xextent).nice()
                .range([0, size - padding]);

            var histogram = d3.histogram()
                .value(function (d) { return +d[p.x]; })
                .domain(x2.domain())
                .thresholds(x2.ticks(15));

            var bins = histogram(data);

            var y2 = d3.scaleLinear()
                .range([size - padding, 0])
                .domain([0, d3.max(bins, function (d) { return d.length; })]);

            tmp.append('g').attr("transform", `translate(${0}, ${0})`)
                .selectAll("rect")
                .data(bins)
                .enter()
                .append("rect")
                .attr("x", 1)
                .attr("transform", function (d) { return "translate(" + x2(d.x0) + "," + y2(d.length) + ")"; })
                .attr("width", function (d) { return x2(d.x1) - x2(d.x0); })
                .attr("height", function (d) { return (size - padding) - y2(d.length); })
                .style("fill", "#7f7f7f")
                .attr("stroke", "white");

            tmp.append("text")
                .text(p.x)
                .attr("text-anchor", "middle")
                .attr("x", size / 2 - padding / 2)
                .attr("y", padding / 2)
                .style("fill", "#000000")
                .style("font-size", 12);

            tmp.append("rect")
                .attr("class", "frame")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", size - padding)
                .attr("height", size - padding);

            tmp.append("g")
                .attr("transform", `translate(${0}, ${size - padding})`)
                .call(d3.axisBottom().scale(x2).ticks(6));

            tmp.append("g")
                .attr("transform", `translate(0, ${0})`)
                .call(d3.axisLeft().scale(y2).ticks(6));
        }
    }

    svg.append("rect")
        .attr("x", (size * n) / 2 - 150)
        .attr("y", -15)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color("setosa")); 

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (size * n) / 2 - 95)
        .attr("y", 0)
        .text("Iris-setosa")
        .style("fill", color("setosa"));  

    svg.append("rect")
        .attr("x", (size * n) / 2 - 40)
        .attr("y", -15)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color("versicolor"));  

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (size * n) / 2 + 25)
        .attr("y", 0)
        .text("Iris-versicolor")
        .style("fill", color("versicolor"));  

    svg.append("rect")
        .attr("x", (size * n) / 2 + 85)
        .attr("y", -15)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color("virginica"));  

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (size * n) / 2 + 145)
        .attr("y", 0)
        .text("Iris-virginica")
        .style("fill", color("virginica")); 

    var brushCell;

    function brushstart(p) {
        if (brushCell !== this) {
            d3.select(brushCell).call(brush.move, null);
            brushCell = this;
            x.domain(domainByTrait[p.x]);
            y.domain(domainByTrait[p.y]);
        }
    }

    function brushmove(p) {
        var e = d3.brushSelection(this);
        svg.selectAll("circle").classed("hidden", function (d) {
            if (!e) return false;
            return (e[0][0] > x(+d[p.x]) || x(+d[p.x]) > e[1][0] || e[0][1] > y(+d[p.y]) || y(+d[p.y]) > e[1][1]);
        });
    }

    function brushend() {
        if (!d3.brushSelection(this)) {
            svg.selectAll(".hidden").classed("hidden", false);
        }
    }
});

function cross(a, b) {
    var c = [], n = a.length, m = b.length, i, j;
    for (i = -1; ++i < n;) {
        for (j = -1; ++j < m;) {
            c.push({ x: a[i], i: i, y: b[j], j: j });
        }
    }
    return c;
}