const margin = { top: 20, right: 30, bottom: 50, left: 40 }, 
    width = 760 - margin.left - margin.right,  
    height = 500 - margin.top - margin.bottom;

const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const data_path = "./ma_lga_12345.csv";

d3.csv(data_path).then(function (data) {
    var data_1 = {};
    for (let i = 0; i < data.length; i++) {
        if (!(data[i]["saledate"] in data_1)) {
            data_1[data[i]["saledate"]] = {
                "house with 2 bedrooms": 0,
                "house with 3 bedrooms": 0,
                "house with 4 bedrooms": 0,
                "house with 5 bedrooms": 0,
                "unit with 1 bedrooms": 0,
                "unit with 2 bedrooms": 0,
                "unit with 3 bedrooms": 0,
            };
        }
        const class_str = `${data[i]["type"]} with ${data[i]["bedrooms"]} bedrooms`;
        data_1[data[i]["saledate"]][class_str] = +data[i]["MA"];
    }

    var data_2 = [];
    for (const [key, value] of Object.entries(data_1)) {
        value["date"] = moment(key, "DD/MM/YYYY").toDate();
        data_2.push(value);
    }

    data_2.sort((a, b) => a["date"] - b["date"]);

    var keys = Object.keys(data_2[0]).slice(0, -1);

    const color = d3.scaleOrdinal()
        .domain(keys)
        .range(["#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#a0c4ff", "#bdb2ff"]);

    var blocks = document.getElementById('blocks');
    let html = "";
    for (let i = 0; i < keys.length; i++) {
        html += `<div class="list-group-item" style="background-color:${color(keys[i])}" data-key="${keys[i]}">${keys[i]}</div>`;
    }
    blocks.innerHTML = html;

    var sortable = new Sortable(blocks, {
        animation: 150,
        onChange: function () {
            let blocks_divs = blocks.getElementsByTagName("div");
            let new_keys = [];
            for (let i = 0; i < blocks_divs.length; i++) {
                new_keys.push(blocks_divs[i].textContent);
            }
            render(new_keys.reverse());
        }
    });

    d3.selectAll(".list-group-item").on("click", function () {
        const key = d3.select(this).attr("data-key");
        const area = svg.selectAll(".myArea").filter(function (d) { return d.key === key; });
        const isHidden = area.classed("hidden");
        area.classed("hidden", !isHidden)
            .transition().duration(500)
            .style("opacity", isHidden ? 1 : 0);
    });

    render(keys.reverse());

    function render(keys) {
        svg.selectAll('*').remove();

        const x = d3.scaleLinear()
            .domain(d3.extent(data_2, function (d) { return d["date"]; }))
            .range([0, width]);

        svg.append("g")
            .attr("transform", `translate(0, ${height * 0.9})`)
            .call(d3.axisBottom(x).ticks(4).tickFormat(d3.utcFormat("%B %d, %Y")).tickSize(-height * 0.7))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "0.15em")
            .attr("transform", "rotate(-40)");  

        svg.selectAll(".tick line").attr("stroke", "#b8b8b8");

        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height - 30)
            .text("Date");

        const y = d3.scaleLinear()
            .domain([-4000000, 4000000])
            .range([height, 0]);

        const stackedData = d3.stack()
            .offset(d3.stackOffsetSilhouette)
            .keys(keys)(data_2);

        const Tooltip = d3.select("#tooltip");

        const mouseover = function (event, d) {
            Tooltip
                .style("opacity", 1)
                .style("display", "block");
            d3.selectAll(".myArea").classed("not-hovered", true);
            d3.select(this)
                .classed("hovered", true)
                .classed("not-hovered", false)
                .style("filter", "url(#glow)");
        };

        const mousemove = function (event, d) {
            const [xPos, yPos] = d3.pointer(event);
            const date = x.invert(xPos);
            Tooltip
                .html(`<strong>${d.key}</strong><br>Date: ${d3.utcFormat("%B %d, %Y")(date)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        };

        const mouseleave = function (event, d) {
            Tooltip.style("opacity", 0).style("display", "none");
            d3.selectAll(".myArea").classed("not-hovered", false).classed("hovered", false)
                .style("filter", "none");
        };

        const area = d3.area()
            .x(function (d) { return x(d.data["date"]); })
            .y0(function (d) { return y(d[0]); })
            .y1(function (d) { return y(d[1]); });

        svg.selectAll("mylayers")
            .data(stackedData)
            .join("path")
            .attr("class", "myArea show")
            .style("fill", function (d) { return color(d.key); })
            .attr("d", area)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
            .transition()
            .duration(500)
            .style("opacity", 1);

        svg.append("defs").append("filter")
            .attr("id", "glow")
            .append("feGaussianBlur")
            .attr("stdDeviation", "2.5")
            .attr("result", "coloredBlur");

        let feMerge = svg.select("#glow").append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "coloredBlur");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
    }
});