const dataPath = "./air-pollution.csv";

let selectedYear = "overall";
let selectedCategory = "SO2";

d3.csv(dataPath).then(function (data) {
    console.log("Sample Row from Raw Data:", data[0]);

    function roundTo(num, decimal) {
        return Math.round((num + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
    }

    function filterDataByYear(data, year) {
        if (year === "overall") return data;
        return data.filter(d => d["Measurement date"].startsWith(year));
    }

    function aggregateData(data, type) {
        const sums = data.reduce((acc, obj) => {
            const date = obj["Measurement date"]?.split(" ")[0];
            const station = obj["Station code"];
            const address = obj["Address"] || "N/A";
            const latitude = obj["Latitude"] || "N/A";
            const longitude = obj["Longitude"] || "N/A";

            if (!acc[date]) acc[date] = {};
            if (!acc[date][station]) {
                acc[date][station] = { sum: 0, count: 0, address, latitude, longitude };
            }

            acc[date][station].sum += +obj[type];
            acc[date][station].count++;
            return acc;
        }, {});

        const aggregatedData = Object.keys(sums).map(date =>
            Object.keys(sums[date]).map(station => ({
                ts: new Date(date),
                series: station,
                val: roundTo(sums[date][station].sum / sums[date][station].count, 6),
                address: sums[date][station].address,
                latitude: sums[date][station].latitude,
                longitude: sums[date][station].longitude
            }))
        ).flat();

        console.log("Sample Row from Aggregated Data:", aggregatedData[0]);
        return aggregatedData;
    }

    function renderChart() {
        const yearData = filterDataByYear(data, selectedYear);
        document.getElementById("chart-container").innerHTML = "";

        const aggregatedData = aggregateData(yearData, selectedCategory);

        const chartContainer = document.createElement("div");
        chartContainer.className = "horizon-chart-container";

        const title = document.createElement("div");
        title.className = "chart-title";
        title.textContent = `Pollutant: ${selectedCategory} (${selectedYear === "overall" ? "All Years" : selectedYear})`;
        chartContainer.appendChild(title);

        const chart = HorizonTSChart()(chartContainer)
            .data(aggregatedData)
            .series("series")
            .height(650)
            .width(1200)
            .enableZoom(true)
            .positiveColors(['white', '#258B45']) 
            .negativeColors(['white', '#DD4D36'])
            .tooltipContent(({ series, ts, val, points }) => {
                const { address = "N/A", latitude = "N/A", longitude = "N/A" } = points[0];
                return `
                    <b>Station Code:</b> ${series}<br>
                    <b>Date:</b> ${new Date(ts).toLocaleDateString()}<br>
                    <b>Value:</b> ${val.toFixed(6)}<br>
                    <b>Address:</b> ${address}<br>
                    <b>Latitude:</b> ${latitude}<br>
                    <b>Longitude:</b> ${longitude}
                `;
            });

        document.getElementById("chart-container").appendChild(chartContainer);
    }

    document.querySelectorAll('#year-buttons .btn').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('#year-buttons .btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedYear = this.getAttribute('data-year');
            renderChart();
        });
    });

    document.querySelectorAll('#category-buttons .btn').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('#category-buttons .btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedCategory = this.getAttribute('data-category');
            renderChart();
        });
    });

    renderChart();
});
