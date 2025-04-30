// Define margins and initial chart dimensions
const margin = { top: 70, right: 30, bottom: 70, left: 250 };
let svgWidth = 1200; // Keep initial width
let svgHeight = 800; // Will adjust based on data

// Create SVG and groups
const svg = d3.select("#chart-container").append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);

const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const legendGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, 20)`);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// CSV files to load
const files = [
    "./data/Yellow_2024.csv", "./data/Blue_2024.csv", "./data/Orange_2024.csv", "./data/Red_2024.csv", "./data/Green_2024.csv", "./data/Brown_2024.csv",
    "./data/Yellow_2023.csv", "./data/Blue_2023.csv", "./data/Orange_2023.csv", "./data/Red_2023.csv", "./data/Green_2023.csv", "./data/Brown_2023.csv",
    "./data/Yellow_2022.csv", "./data/Blue_2022.csv", "./data/Orange_2022.csv", "./data/Red_2022.csv", "./data/Green_2022.csv", "./data/Brown_2022.csv",
    "./data/Yellow_2021.csv", "./data/Blue_2021.csv", "./data/Orange_2021.csv", "./data/Red_2021.csv", "./data/Green_2021.csv", "./data/Brown_2021.csv",
    "./data/Yellow_2020.csv", "./data/Blue_2020.csv", "./data/Orange_2020.csv", "./data/Red_2020.csv", "./data/Green_2020.csv", "./data/Brown_2020.csv",
    "./data/Yellow_2019.csv", "./data/Blue_2019.csv", "./data/Orange_2019.csv", "./data/Red_2019.csv", "./data/Green_2019.csv", "./data/Brown_2019.csv",
    "./data/Yellow_2018.csv", "./data/Blue_2018.csv", "./data/Orange_2018.csv", "./data/Red_2018.csv", "./data/Green_2018.csv", "./data/Brown_2018.csv",
    "./data/Yellow_2017.csv", "./data/Blue_2017.csv", "./data/Orange_2017.csv", "./data/Red_2017.csv", "./data/Green_2017.csv", "./data/Brown_2017.csv"
];

let allData = [];

// Define line names and colors for legend
const lineMapping = {
    "Yellow": { name: "環狀線", color: "#FFD400" },
    "Blue": { name: "板藍線", color: "#0070BB" },
    "Orange": { name: "中和線", color: "#FFAA33" },
    "Red": { name: "淡水線", color: "#E3002B" },
    "Green": { name: "新店線", color: "#008859" },
    "Brown": { name: "文湖線", color: "#BB7744" }
};

// Reverse mapping from line names to colors
const lineNameToColor = {};
for (const key in lineMapping) {
    const { name, color } = lineMapping[key];
    lineNameToColor[name] = color;
}

// Load all CSV files
Promise.all(files.map(file => d3.csv(file))).then(datasets => {
    datasets.forEach((data) => {
        data.forEach(d => {
            const lineKey = d.line;
            const lineInfo = lineMapping[lineKey];
            allData.push({
                date: d.date, // expecting 'YYYY-MM-DD'
                station: d.station,
                population: +d.people,
                line_name: lineInfo.name,
                line_color: lineInfo.color
            });
        });
    });

    initializeSelectors();
    createLegend();
    updateChart(); // Initial display
});

// Initialize selectors dynamically
function initializeSelectors() {
    const uniqueYears = [...new Set(allData.map(d => d.date.split('-')[0]))].sort();
    const yearSelect = document.getElementById("year-select");

     // 先加入一個 "All" 選項
     yearSelect.innerHTML = '<option value="">All</option>';

    uniqueYears.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

// 將 year-select 的預設值設定為 "" (All)
yearSelect.value = "";

    yearSelect.addEventListener("change", () => {
        updateMonthAndDateOptions();
        updateChart();
    });
    document.getElementById("month-select").addEventListener("change", () => {
        updateDateOptions();
        updateChart();
    });
    document.getElementById("date-select").addEventListener("change", () => {
        updateChart();
    });
    document.getElementById("sort-order").addEventListener("change", () => {
        updateChart();
    });
    document.getElementById("sort-line").addEventListener("change", () => {
        updateChart();
    });
    document.getElementById("update-button").addEventListener("click", () => {
        updateChart();
    });

    updateMonthAndDateOptions();
}

// Update month and date options
function updateMonthAndDateOptions() {
    const selectedYear = document.getElementById("year-select").value;
    const filteredData = allData.filter(d => d.date.startsWith(selectedYear));

    const uniqueMonths = [...new Set(filteredData.map(d => new Date(d.date).getMonth() + 1))].sort((a, b) => a - b);

    const monthSelect = document.getElementById("month-select");
    monthSelect.innerHTML = '<option value="">All</option>';

    uniqueMonths.forEach(month => {
        const option = document.createElement("option");
        option.value = month;
        option.textContent = `${month}月`;
        monthSelect.appendChild(option);
    });

    updateDateOptions();
}

function updateDateOptions() {
    const selectedYear = document.getElementById("year-select").value;
    const selectedMonth = document.getElementById("month-select").value;

    let filteredData = allData;
    if (selectedYear) filteredData = filteredData.filter(d => d.date.startsWith(selectedYear));
    if (selectedMonth) filteredData = filteredData.filter(d => (new Date(d.date).getMonth() + 1) == selectedMonth);

    const uniqueDates = [...new Set(filteredData.map(d => d.date))].sort();

    const dateSelect = document.getElementById("date-select");
    dateSelect.innerHTML = '<option value="">All</option>';

    uniqueDates.forEach(date => {
        const dateObj = new Date(date);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const option = document.createElement("option");
        option.value = date;
        option.textContent = `${month}/${day}`;
        dateSelect.appendChild(option);
    });
}

// Create legend
function createLegend() {
    const legendData = Object.values(lineMapping);

    legendGroup.selectAll("g")
        .data(legendData)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${i * 150}, 0)`)
        .call(g => {
            g.append("rect")
                .attr("width", 20)
                .attr("height", 20)
                .attr("fill", d => d.color);

            g.append("text")
                .attr("x", 25)
                .attr("y", 15)
                .style("font-size", "20px")
                .text(d => d.name);
        });
}

// Update chart
function updateChart() {
    const selectedYear = document.getElementById("year-select").value;
    const selectedMonth = document.getElementById("month-select").value;
    const selectedDate = document.getElementById("date-select").value;
    const sortOrder = document.getElementById("sort-order").value;
    const sortLine = document.getElementById("sort-line").value; // line name to filter by

    let filteredData = allData;
    if (selectedYear) filteredData = filteredData.filter(d => d.date.startsWith(selectedYear));
    if (selectedMonth) filteredData = filteredData.filter(d => (new Date(d.date).getMonth() + 1) == selectedMonth);
    if (selectedDate) filteredData = filteredData.filter(d => d.date === selectedDate);

    const groupedData = d3.group(filteredData, d => d.station);
    let aggregatedData = Array.from(groupedData, ([station, records]) => {
        const total_population = d3.sum(records, r => r.population);
        const lineData = d3.rollups(records, v => d3.sum(v, d => d.population), d => d.line_name);
        
        let x0 = 0;
        const details = lineData.map(([line_name, population]) => {
            const line_color = lineNameToColor[line_name];
            const detail = { line_name, line_color, population, x0 };
            x0 += population;
            return detail;
        });

        return { station, total_population, details };
    });

    // Filter by chosen line if needed
    if (sortLine) {
        aggregatedData.forEach(d => {
            const filteredDetails = d.details.filter(dt => dt.line_name === sortLine);
            d.details = filteredDetails;
            const newTotal = d3.sum(filteredDetails, dt => dt.population);
            d.total_population = newTotal;

            let x0 = 0;
            d.details.forEach(dt => {
                dt.x0 = x0;
                x0 += dt.population;
            });
        });

        // Remove stations with no data for that line
        aggregatedData = aggregatedData.filter(d => d.total_population > 0);
    }

    // Sorting
    aggregatedData.sort((a, b) => sortOrder === "ascending" ? a.total_population - b.total_population : b.total_population - a.total_population);

    // Dynamically adjust chart height based on data count
    const barHeight = 25;
    const chartHeight = aggregatedData.length * barHeight;
    const totalHeight = chartHeight + margin.top + margin.bottom + 100;

    svg.transition().duration(500).attr("height", totalHeight);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, d => d.total_population) || 0])
        .range([0, svgWidth - margin.left - margin.right]);

    const yScale = d3.scaleBand()
        .domain(aggregatedData.map(d => d.station))
        .range([0, chartHeight])
        .padding(0.2);

    // Clear old elements
    chartGroup.selectAll(".station-group").remove();
    chartGroup.selectAll(".axis").remove();
    chartGroup.selectAll(".x-grid").remove();

    // Add station groups
    const stationGroup = chartGroup.selectAll(".station-group")
        .data(aggregatedData, d => d.station);

    const stationGroupEnter = stationGroup.enter().append("g")
        .attr("class", "station-group")
        .attr("transform", d => `translate(0, ${yScale(d.station)})`);

    // Add rects
    const rects = stationGroupEnter.selectAll("rect")
        .data(d => d.details)
        .enter().append("rect")
        .attr("x", d => xScale(d.x0))
        .attr("y", 0)
        .attr("height", yScale.bandwidth())
        .attr("fill", d => d.line_color)
        // 初始寬度為0，之後使用transition()動畫到最終寬度
        .attr("width", 0);

    // Transition for bars
    rects.transition()
        .duration(1000)
        .attr("width", d => xScale(d.population));

    // Add tooltip events on bars
    rects.on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`Line: ${d.line_name}<br>Population: ${d.population}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Tooltip for station totals on the group
    stationGroupEnter
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`Station: ${d.station}<br>Total Population: ${d.total_population.toLocaleString()}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Axis
    const xAxis = d3.axisBottom(xScale).ticks(10) 
    .tickFormat(d3.format(".2s")); // 使用 SI prefix 格式化數字; // kkkkkkk
    const yAxis = d3.axisLeft(yScale);

   

    chartGroup.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(xAxis);

    chartGroup.append("g")
        .attr("class", "axis")
        .call(yAxis);

    // Transition for positions if data updates
    stationGroupEnter.merge(stationGroup)
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(0, ${yScale(d.station)})`);
}
