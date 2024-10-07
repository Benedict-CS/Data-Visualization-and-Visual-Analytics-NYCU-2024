var margin = { top: 50, right: 150, bottom: 50, left: 70 },
    width = 660 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var color = d3.scaleOrdinal()
    .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
    .range(["red", "green", "blue"]);

d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv", function (data) {
    data.forEach(function (d) {
        d['sepal length'] = +d['sepal length'];
        d['sepal width'] = +d['sepal width'];
        d['petal length'] = +d['petal length'];
        d['petal width'] = +d['petal width'];
    });

    data = data.filter(function (d) {
        return !isNaN(d['sepal length']) && !isNaN(d['sepal width']) &&
            !isNaN(d['petal length']) && !isNaN(d['petal width']);
    });

    var xAttr = "sepal length";
    var yAttr = "sepal width";

    function updateScatterPlot() {
        var xExtent = d3.extent(data, function (d) { return d[xAttr]; });
        var yExtent = d3.extent(data, function (d) { return d[yAttr]; });

        var xMin = Math.floor(xExtent[0]);
        var xMax = Math.ceil(xExtent[1]);
        var yMin = Math.floor(yExtent[0]);
        var yMax = Math.ceil(yExtent[1]);

        var x = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, width]);

        var y = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0]);

        svg.selectAll("*").remove();

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.append('g')
            .selectAll("dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return x(d[xAttr]); })
            .attr("cy", function (d) { return y(d[yAttr]); })
            .attr("r", 3)
            .style("fill", function (d) { return color(d['class']); })
            .style("opacity", 0.5);

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .text(xAttr.charAt(0).toUpperCase() + xAttr.slice(1))
            .attr("class", "axis-label");

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .text(yAttr.charAt(0).toUpperCase() + yAttr.slice(1))
            .attr("class", "axis-label");

        var legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (width + 20) + ",0)");

        var legendData = color.domain();
        legendData.forEach(function (d, i) {
            var legendItem = legend.append("g")
                .attr("transform", "translate(0," + (i * 20) + ")");

            legendItem.append("rect")
                .attr("x", 0)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", color(d));

            legendItem.append("text")
                .attr("x", 25)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(d);
        });
    }

    d3.select("#x-axis").on("change", function () {
        xAttr = this.value;
        updateScatterPlot();
    });

    d3.select("#y-axis").on("change", function () {
        yAttr = this.value;
        updateScatterPlot();
    });

    updateScatterPlot();
});
