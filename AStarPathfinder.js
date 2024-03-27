class AStarPathfinder
{
    constructor(nodes, edges, logUpdateFunction)
    {
        this.nodes = nodes;
        this.edges = edges;
        this.logUpdate = logUpdateFunction; 
        this.nodeMap = new Map(nodes.map(node => [node.id, node]));
        this.adjacencyList = this.createAdjacencyList(edges);
    }

    createAdjacencyList(edges)
    {
        const list = new Map();
        edges.forEach(edge =>
        {
            if (!list.has(edge.source))
            {
                list.set(edge.source, []);
            }
            if (!list.has(edge.target))
            {
                list.set(edge.target, []);
            }
            const sourceNode = this.nodeMap.get(edge.source);
            const targetNode = this.nodeMap.get(edge.target);
            if (!sourceNode || !targetNode)
            {
                console.log(`Missing node for edge: ${edge.source}, ${edge.target}`);
                return; 
            }
            const distance = this.calculateDistance(sourceNode, targetNode);
            list.get(edge.source).push({ node: edge.target, cost: distance });
            list.get(edge.target).push({ node: edge.source, cost: distance });
        });
        return list;
    }

    calculateDistance(node1, node2)
    {
        const lat1 = node1.lat, lon1 = node1.lon, lat2 = node2.lat, lon2 = node2.lon;
        const radLat1 = Math.PI * lat1 / 180;
        const radLat2 = Math.PI * lat2 / 180;
        const theta = lon1 - lon2;
        const radTheta = Math.PI * theta / 180;
        let dist = Math.sin(radLat1) * Math.sin(radLat2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta);
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        dist = dist * 1.609344;

        const elevationDifference = node2.elevation - node1.elevation;
        const elevationCost = this.calculateElevationCost(elevationDifference);

        return dist + elevationCost;
    }

    calculateElevationCost(elevationDifference)
    {
        if (elevationDifference > 0)
        {
            return elevationDifference * 0.01; 
        }
        else
        {
            return elevationDifference * -0.005; 
        }
    }

    findPath(startId, goalId)
    {
        const startTime = performance.now();
        const openSet = new Set([startId]);
        const cameFrom = new Map();
    
        const gScore = new Map(this.nodes.map(node => [node.id, Infinity]));
        gScore.set(startId, 0);
    
        const fScore = new Map(this.nodes.map(node => [node.id, Infinity]));
        fScore.set(startId, this.heuristic(startId, goalId));
    
        let maxOpenSetSize = 1; 
    
        while (openSet.size > 0)
        {
            let current = [...openSet].reduce((a, b) => fScore.get(a) < fScore.get(b) ? a : b);
    
            if (current === goalId)
            {
                const endTime = performance.now();
                if (this.logUpdate)
                {
                    this.logUpdate('searchTime', `${(endTime - startTime).toFixed(2)} milliseconds`);
                    this.logUpdate('maxOpenSetSize', maxOpenSetSize.toString());
                    this.logUpdate('cameFromSize', cameFrom.size.toString());
                }
                return this.reconstructPath(cameFrom, current);
            }
    
            openSet.delete(current);
            for (let neighbor of this.adjacencyList.get(current))
            {
                let tentative_gScore = gScore.get(current) + neighbor.cost;
                if (tentative_gScore < gScore.get(neighbor.node))
                {
                    cameFrom.set(neighbor.node, current);
                    gScore.set(neighbor.node, tentative_gScore);
                    fScore.set(neighbor.node, tentative_gScore + this.heuristic(neighbor.node, goalId));
                    if (!openSet.has(neighbor.node))
                    {
                        openSet.add(neighbor.node);
                        if (openSet.size > maxOpenSetSize)
                        {
                            maxOpenSetSize = openSet.size;
                        }
                    }
                }
            }
        }
    
        const endTime = performance.now();
        console.log(`Search completed in ${(endTime - startTime).toFixed(2)} milliseconds but no path found.`);
        console.log(`Maximum open set size: ${maxOpenSetSize}`);
        console.log(`Size of 'cameFrom' map: ${cameFrom.size}`);
        return [];
    }
    
    heuristic(nodeId1, nodeId2)
    {
        const node1 = this.nodeMap.get(nodeId1);
        const node2 = this.nodeMap.get(nodeId2);
        return Math.hypot(node1.lat - node2.lat, node1.lon - node2.lon); 
    }
    
    reconstructPath(cameFrom, current)
    {
        const totalPath = [current];
        while (cameFrom.has(current))
        {
            current = cameFrom.get(current);
            totalPath.unshift(current);
        }
        return totalPath;
    }
    
}