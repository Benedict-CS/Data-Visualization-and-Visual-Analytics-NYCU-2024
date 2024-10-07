var margin = { top: 50, right: 150, bottom: 50, left: 70 },  
    width = 1200 - margin.left - margin.right,
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
  data = data.filter(function (d) {
    return d['sepal length'] && d['sepal width'] && d['petal length'] && d['petal width'] && d['class'];
  });

  data.forEach(function (d) {
    d['sepal length'] = +d['sepal length'];
    d['sepal width'] = +d['sepal width'];
    d['petal length'] = +d['petal length'];
    d['petal width'] = +d['petal width'];
  });

  var dimensions = d3.keys(data[0]).filter(function (d) {
    return d !== "class";
  });

  var y = {};
  for (i in dimensions) {
    var name = dimensions[i];
    var extent = d3.extent(data, function (d) { return +d[name]; });

    y[name] = d3.scaleLinear()
      .domain([extent[0] - 0.5, extent[1] + 0.5]) 
      .range([height, 0]);
  }

  var x = d3.scalePoint()
    .range([0, width])
    .padding(1)
    .domain(dimensions);

  var dragging = {};

  var line = d3.line(),
    axis = d3.axisLeft(),
    foreground;

  foreground = svg.append("g")
    .attr("class", "foreground")
    .selectAll("path")
    .data(data)
    .enter().append("path")
    .attr("d", path)
    .style("stroke", function (d) { return color(d['class']); });

  var g = svg.selectAll(".dimension")
    .data(dimensions)
    .enter().append("g")
    .attr("class", "dimension")
    .attr("transform", function (d) { return "translate(" + x(d) + ")"; })
    .call(d3.drag()
      .subject(function (d) { return { x: x(d) }; })
      .on("start", function (d) {
        dragging[d] = x(d);
        foreground.attr("visibility", "hidden");
      })
      .on("drag", function (d) {
        dragging[d] = Math.min(width, Math.max(0, d3.event.x));
        dimensions.sort(function (a, b) { return position(a) - position(b); });
        x.domain(dimensions);
        g.attr("transform", function (d) { return "translate(" + position(d) + ")"; });
      })
      .on("end", function (d) {
        delete dragging[d];
        transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
        transition(foreground)
          .attr("d", path)
          .attr("visibility", null);
      }));

  g.append("g")
    .attr("class", "axis")
    .each(function (d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
    .style("text-anchor", "middle")
    .attr("x", 0)  
    .attr("y", -20)  
    .text(function (d) { return d; })
    .style("fill", "black")  
    .style("font-weight", "bold");

  svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width + 20) + ",0)");

  var legend = svg.selectAll(".legend-item")
    .data(color.domain())
    .enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
    .attr("x", width)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend.append("text")
    .attr("x", width + 25)
    .attr("y", 9)
    .attr("dy", ".35em")
    .text(function (d) { return d; });

  function position(d) {
    return dragging[d] == null ? x(d) : dragging[d];
  }

  function transition(g) {
    return g.transition().duration(500);
  }

  function path(d) {
    return line(dimensions.map(function (p) { return [position(p), y[p](d[p])]; }));
  }

  g.append("g")
    .attr("class", "brush")
    .each(function (d) {
      d3.select(this).call(y[d].brush = d3.brushY()
        .extent([[-8, 0], [8, height]])
        .on("brush end", brush));
    })
    .selectAll("rect")
    .attr("x", -8)
    .attr("width", 16);

  function brush() {
    var actives = [];
    svg.selectAll(".brush")
      .filter(function (d) { return d3.brushSelection(this); })
      .each(function (d) {
        actives.push({
          dimension: d,
          extent: d3.brushSelection(this).map(y[d].invert)
        });
      });

    foreground.style("display", function (d) {
      return actives.every(function (active) {
        return active.extent[1] <= d[active.dimension] && d[active.dimension] <= active.extent[0];
      }) ? null : "none";
    });
  }
});
