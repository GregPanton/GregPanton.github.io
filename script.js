let minLat = Infinity;
let maxLat = -Infinity;
let minLon = Infinity;
let maxLon = -Infinity;
let selectingStart = false;
let selectingEnd = false;
let startNode = null;
let endNode = null;
let pathfinder = null;
let nodes = [];


document.addEventListener('DOMContentLoaded', async () =>
{
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    function resizeCanvas()
    {
        canvas.width = document.querySelector('.map-container').offsetWidth * 0.8;
        canvas.height = canvas.width * 0.5;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const selectStartBtn = document.getElementById('selectStart');
    const selectEndBtn = document.getElementById('selectEnd');
    const calculatePathBtn = document.getElementById('calculatePath');
    const resetMapBtn = document.getElementById('resetMap');

    async function fetchAndParseCsv(url)
    {
        const response = await fetch(url);
        const csv = await response.text();
        return csv.trim().split('\n').map(line =>
        {
            const [id, lon, lat, elevation] = line.split(',').map((value, index) => index === 0 ? value : parseFloat(value));
            if (!isNaN(lat) && !isNaN(lon))
            {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
            }
            return { id, lon, lat, elevation };
        });
    }

    async function fetchEdges(url)
    {
        const response = await fetch(url);
        const csv = await response.text();
        return csv.trim().split('\n').map(line =>
        {
            const [source, target, cost] = line.split(',').map((value, index) => index < 2 ? value : parseFloat(value));
            return { source, target, cost };
        });
    }

    function drawMap()
    {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        nodes.forEach(node =>
        {
            const { lon, lat, elevation } = node;
            const x = (lon - minLon) / (maxLon - minLon) * canvas.width;
            const y = (maxLat - lat) / (maxLat - minLat) * canvas.height;
            ctx.fillStyle = getElevationColor(elevation); 
            ctx.fillRect(x, y, 2, 2); 
        });
    }

    function getElevationColor(elevation)
    {
        
        const minElevation = 0; 
        const maxElevation = 180; 
        const t = (elevation - minElevation) / (maxElevation - minElevation);
        return `rgb(${t * 128}, ${(1 - t) * 128 + 127}, ${t * 128})`;
    }

    function findClosestNode(x, y)
    {
        let closestNode = null;
        let closestDistance = Infinity;
        nodes.forEach(node =>
        {
            const nodeX = (node.lon - minLon) / (maxLon - minLon) * canvas.width;
            const nodeY = (maxLat - node.lat) / (maxLat - minLat) * canvas.height;
            const distance = Math.hypot(nodeX - x, nodeY - y);
            if (distance < closestDistance)
            {
                closestDistance = distance;
                closestNode = node;
            }
        });
        return closestNode;
    }

    function drawPath(path)
    {
        ctx.beginPath();
        path.forEach((nodeId, index) =>
        {
            const node = nodes.find(n => n.id === nodeId);
            const x = (node.lon - minLon) / (maxLon - minLon) * canvas.width;
            const y = (maxLat - node.lat) / (maxLat - minLat) * canvas.height;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function updateLogInfo(type, message)
    {
        let elementId = "";
        switch (type)
        {
            case 'startNode':
                elementId = "startNodeInfo";
                break;
            case 'endNode':
                elementId = "endNodeInfo";
                break;
            case 'searchTime':
                elementId = "searchTimeInfo";
                break;
            case 'maxOpenSetSize':
                elementId = "maxOpenSetSizeInfo";
                break;
            case 'cameFromSize':
                elementId = "cameFromSizeInfo";
                break;
            case 'pathDistance':
                elementId = 'pathDistanceInfo';
                break;
        }

        const infoElement = document.getElementById(elementId);

        if (infoElement)
        {
            infoElement.textContent = message;
        }
        console.log(`${type}: ${message}`); // Keep logging to console as well
    }

    function resetMap()
    {
        startNode = null;
        endNode = null;
        selectingStart = false;
        selectingEnd = false;
        document.getElementById("calculatePath").disabled = true;
        drawMap(); 

        document.getElementById("startNodeInfo").textContent = "";
        document.getElementById("endNodeInfo").textContent = "";
        document.getElementById("searchTimeInfo").textContent = "";
        document.getElementById("maxOpenSetSizeInfo").textContent = "";
        document.getElementById("cameFromSizeInfo").textContent = "";
        document.getElementById("pathDistanceInfo").textContent = "";
    }

    async function init()
    {
        nodes = await fetchAndParseCsv('nodes.csv');
        const edges = await fetchEdges('edges.csv');

        const selectedPathfinderType = document.getElementById('pathfinderSelector').value;

        switch (selectedPathfinderType)
        {
            case 'AStar':
                pathfinder = new AStarPathfinder(nodes, edges, updateLogInfo);
                break;
            case 'Dijkstra':
                pathfinder = new DijkstraPathfinder(nodes, edges, updateLogInfo);
                break;
            case 'Bidirectional':
                pathfinder = new BidirectionalPathfinder(nodes, edges, updateLogInfo);
                break;
            default:
                console.error('Invalid pathfinder selection');
                return;
        }

        drawMap();
    }

    canvas.addEventListener('click', (event) =>
    {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickedNode = findClosestNode(x, y);
        if (selectingStart)
        {
            startNode = clickedNode;
            updateLogInfo('startNode', startNode.id);
            selectingStart = false; 
        } else if (selectingEnd)
        {
            endNode = clickedNode;
            updateLogInfo('endNode', endNode.id);
            selectingEnd = false; 
            calculatePathBtn.disabled = false; 
        }
    });

    selectStartBtn.addEventListener('click', () =>
    {
        selectingStart = true;
        selectingEnd = false;
        console.log('Selecting start node...');
    });

    selectEndBtn.addEventListener('click', () =>
    {
        selectingStart = false;
        selectingEnd = true;
        console.log('Selecting end node...');
    });

    calculatePathBtn.addEventListener('click', () =>
    {
        if (startNode && endNode)
        {
            console.log('Calculating shortest path...');
            const path = pathfinder.findPath(startNode.id, endNode.id);
            if (path && path.length > 0)
            {
                drawPath(path);
                console.log('Path found:', path);
            } else
            {
                console.log('No path found.');
            }
            calculatePathBtn.disabled = true; 
        }
    });

    document.getElementById('pathfinderSelector').addEventListener('change', () =>
    {
        resetMap();
        init();
    });

    document.getElementById('setNodes').addEventListener('click', () =>
    {
        const startNodeId = document.getElementById('startNodeId').value;
        const endNodeId = document.getElementById('endNodeId').value;

        startNode = nodes.find(node => node.id === startNodeId);
        endNode = nodes.find(node => node.id === endNodeId);

        if (startNode && endNode)
        {
            console.log(`Start node set to ${startNode.id}, end node set to ${endNode.id}`);

            document.getElementById('calculatePath').disabled = false;

            updateLogInfo('startNode', startNodeId);
            updateLogInfo('endNode', endNodeId);
        }
        else
        {
            console.error('Start or end node not found. Please check the IDs.');
        }
    });

    resetMapBtn.addEventListener('click', () =>
    {
        resetMap();
    });

    init();
});

