// Set the dimensions and margins of the graph
const margin = { top: 80, right: 50, bottom: 50, left: 300 };
const fixedChartWidth = 900; // Fixed width for the chart area

// Append the svg object to the page's container
const svgContainer = d3.select("#my_dataviz").append("svg");
const svgGroup = svgContainer.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Define the color scale
const keys = ["scores_teaching", "scores_research", "scores_citations", "scores_industry_income", "scores_international_outlook"];
const color = d3.scaleOrdinal(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"]);

// Tooltip creation
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Load the data
const data_path = "https://raw.githubusercontent.com/AndyChiangSH/1121-data-visualization/refs/heads/main/Homeworks/HW5_Stacked%20Bar%20Charts/TIMES_WorldUniversityRankings_2024.csv";

d3.csv(data_path).then(function (data) {
    // Filter data and exclude scores_overall from stack calculation
    const new_data = data.filter(d => d["rank"] !== "Reporter").map(d => ({
        "name": d["name"],
        "scores_teaching": +d["scores_teaching"],
        "scores_research": +d["scores_research"],
        "scores_citations": +d["scores_citations"],
        "scores_industry_income": +d["scores_industry_income"],
        "scores_international_outlook": +d["scores_international_outlook"]
    }));

    // Calculate maximum stack value to set the xScale domain (excluding scores_overall)
    const maxStackValue = d3.max(new_data, d => d.scores_teaching + d.scores_research + d.scores_citations + d.scores_industry_income + d.scores_international_outlook);

    // Set xScale with a larger domain to add right padding
    const xScale = d3.scaleLinear()
        .domain([0, maxStackValue * 1.2]) // Extending domain by 20% to add extra space on the right
        .range([0, fixedChartWidth]);

    function sort_data(data, sort_by, sort_order) {
        return data.sort((a, b) => sort_order === "descending" ? b[sort_by] - a[sort_by] : a[sort_by] - b[sort_by]);
    }

    function render_stacked_bar_charts(data, sort_by = null) {
        const barHeight = 30; // Fixed height for each bar
        const totalHeight = barHeight * data.length + margin.top + margin.bottom;

        // Calculate the dynamic width based on maximum bar length
        const chartWidth = fixedChartWidth + margin.left + margin.right;

        // Adjust SVG dimensions dynamically
        svgContainer.attr("width", chartWidth).attr("height", totalHeight);

        // Clear previous elements in the group
        svgGroup.selectAll('*').remove();

        // Create yScale based on data size
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, barHeight * data.length])
            .padding(0.1);

        // Adjust the order of keys based on the selected sort_by value (ensure scores_overall is not included)
        let reorderedKeys = [...keys];
        if (sort_by && sort_by !== "scores_overall") {
            reorderedKeys = [sort_by].concat(keys.filter(key => key !== sort_by));  // Move selected key to the front
        }

        // Stack the data with reordered keys (excluding scores_overall)
        const stack = d3.stack().keys(reorderedKeys);
        const stackedData = stack(data);

        // Append vertical grid lines
        svgGroup.append("g")
            .attr("class", "grid")
            .call(d3.axisBottom(xScale).tickSize(totalHeight - margin.top - margin.bottom).tickFormat("").ticks(6))  // Fewer ticks for a cleaner look
            .attr("transform", `translate(0,0)`);

        // Append bars with hover interaction and animation
        const groups = svgGroup.append("g")
            .selectAll("g")
            .data(stackedData)
            .join("g")
            .attr("fill", d => color(d.key))
            .selectAll("rect")
            .data(d => d)
            .join("rect")
            .attr("x", d => xScale(d[0]))
            .attr("y", d => yScale(d.data.name))
            .attr("height", yScale.bandwidth())
            .attr("width", 0)  // Initial width 0 for animation
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 0.8);
                tooltip.transition().duration(200).style("opacity", .9);
                const category = this.parentNode.__data__.key;  // Get the category key
                tooltip.html(`${d.data.name}<br>${category}: ${(d[1] - d[0]).toFixed(2)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 1);
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .transition() // Apply animation
            .duration(1000)
            .attr("width", d => xScale(d[1]) - xScale(d[0]));

        // X Axis
        svgGroup.append("g")
            .attr("transform", `translate(0, ${totalHeight - margin.bottom - margin.top})`)
            .call(d3.axisBottom(xScale).ticks(7).tickSize(0).tickFormat(d3.format(".1s")));

        // Y Axis with smaller font size for school names
        svgGroup.append("g")
            .call(d3.axisLeft(yScale).tickSize(0).tickPadding(8))
            .selectAll("text")
            .style("font-size", "10px"); // Smaller font size for university names

        // Axis labels and title
        svgGroup.append("text")
            .attr("class", "chart-label")
            .attr("x", chartWidth / 2 - margin.left)
            .attr("y", totalHeight - margin.bottom / 2)
            .attr("text-anchor", "middle")
            .text("Score (0~100)");

        svgGroup.append("text")
            .attr("class", "chart-title")
            .attr("x", -(margin.left) * 0.8)
            .attr("y", -(margin.top) / 1.5)
            .attr("text-anchor", "start")
            .text("Times World University Rankings 2024");

        // Add legend with click interaction for highlighting
        const legend = svgGroup.selectAll(".legend")
            .data(keys)
            .enter().append("g")
            .attr("transform", (d, i) => `translate(${i * 160}, -40)`);

        legend.append("rect")
            .attr("x", -margin.left * 0.8)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", color);

        legend.append("text")
            .attr("x", -margin.left * 0.8 + 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(d => d); 
    }

    // Button event listener
    document.querySelector("#sort-button").addEventListener("click", function () {
        const sort_by = document.querySelector("#sort-by").value;
        const sort_order = document.querySelector("#sort-order").value;
        const sorted_data = sort_data(new_data, sort_by, sort_order);
        render_stacked_bar_charts(sorted_data, sort_by);
    });

    // Initial render
    render_stacked_bar_charts(new_data);
});
