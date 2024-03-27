class BidirectionalPathfinder {
    constructor(nodes, edges, logUpdateFunction)
    {
        this.maxOpenSetSizeStart = 0; 
        this.maxOpenSetSizeGoal = 0;
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
            list.get(edge.source).push({ node: edge.target, cost: edge.cost });
            list.get(edge.target).push({ node: edge.source, cost: edge.cost });
        });
        return list;
    }

    heuristic(nodeId1, nodeId2)
    {
        const node1 = this.nodeMap.get(nodeId1);
        const node2 = this.nodeMap.get(nodeId2);
        return Math.hypot(node1.lat - node2.lat, node1.lon - node2.lon); 
    }

    calculateTotalDistance(path, nodeMap)
    {
        let totalDistance = 0;
        for (let i = 0; i < path.length - 1; i++)
        {
            const nodeA = nodeMap.get(path[i]);
            const nodeB = nodeMap.get(path[i + 1]);
            const distance = this.calculateDistance(nodeA, nodeB); 
            totalDistance += distance;
        }
        return totalDistance;
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
        dist = dist * 60 * 1.1515 * 1.609344; 
    
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

        let startOpenSet = new Set([startId]);
        let goalOpenSet = new Set([goalId]);
        let startCameFrom = new Map();
        let goalCameFrom = new Map();
        let gScore = new Map(this.nodes.map(node => [node.id, Infinity]));
        gScore.set(startId, 0);
        gScore.set(goalId, 0);
        let fScoreStart = new Map(this.nodes.map(node => [node.id, Infinity]));
        let fScoreGoal = new Map(this.nodes.map(node => [node.id, Infinity]));
        fScoreStart.set(startId, this.heuristic(startId, goalId));
        fScoreGoal.set(goalId, this.heuristic(goalId, startId));

        while (startOpenSet.size > 0 && goalOpenSet.size > 0)
        {
            this.maxOpenSetSizeStart = Math.max(this.maxOpenSetSizeStart, startOpenSet.size);
            this.maxOpenSetSizeGoal = Math.max(this.maxOpenSetSizeGoal, goalOpenSet.size);
            let currentStart = this.getLowestFScoreNode(startOpenSet, fScoreStart);
            let currentGoal = this.getLowestFScoreNode(goalOpenSet, fScoreGoal);

            if (startCameFrom.has(currentGoal) || goalCameFrom.has(currentStart))
            {
                const endTime = performance.now();
                const combinedMaxOpenSetSize = this.maxOpenSetSizeStart + this.maxOpenSetSizeGoal;
                const combinedCameFromSize = startCameFrom.size + goalCameFrom.size;
                const finalPath = this.reconstructPath(startCameFrom, goalCameFrom, currentStart, currentGoal, startId, goalId);
                const totalDistance = this.calculateTotalDistance(finalPath, this.nodeMap); 


                this.logUpdate("pathDistance", totalDistance.toFixed(2));
                this.logUpdate('cameFromSize', combinedCameFromSize.toString());
                this.logUpdate('maxOpenSetSize', combinedMaxOpenSetSize.toString());
                this.logUpdate('searchTime', `${(endTime - startTime).toFixed(2)} milliseconds`);
                return finalPath;
            }

            startOpenSet.delete(currentStart);
            goalOpenSet.delete(currentGoal);

            this.processNeighbors(currentStart, startOpenSet, gScore, fScoreStart, startCameFrom, goalId, true);
            this.processNeighbors(currentGoal, goalOpenSet, gScore, fScoreGoal, goalCameFrom, startId, false);

        }

        const endTime = performance.now();
        this.logUpdate('searchTime', `${(endTime - startTime).toFixed(2)} milliseconds but no path found.`);
        return [];
    }

    getLowestFScoreNode(openSet, fScore)
    {
        let lowest = null;
        let lowestScore = Infinity;
        for (let node of openSet)
        {
            let score = fScore.get(node);
            if (score < lowestScore)
            {
                lowestScore = score;
                lowest = node;
            }
        }
        return lowest;
    }

    processNeighbors(nodeId, openSet, gScore, fScore, cameFrom, otherGoalId, isStart)
    {
        const neighbors = this.adjacencyList.get(nodeId);
        if (!Array.isArray(neighbors))
        {
            console.error(`Neighbors for nodeId ${nodeId} are not iterable:`, neighbors);
            return;
        }
    
        neighbors.forEach(neighbor =>
        {
            const neighborNode = this.nodeMap.get(neighbor.node);
            const currentNode = this.nodeMap.get(nodeId);
            let tentativeGScore = gScore.get(nodeId) + this.calculateDistance(currentNode, neighborNode);
    
            if (tentativeGScore < gScore.get(neighbor.node))
            {
                cameFrom.set(neighbor.node, nodeId);
                gScore.set(neighbor.node, tentativeGScore);
                fScore.set(neighbor.node, tentativeGScore + this.heuristic(neighbor.node, otherGoalId));
                if (!openSet.has(neighbor.node))
                {
                    openSet.add(neighbor.node);
                }
            }
        });
    }
    reconstructPath(startCameFrom, goalCameFrom, currentStart, currentGoal, startId, goalId)
    {
        let path = [];
        while (currentStart !== startId)
        {
            path.unshift(currentStart);
            currentStart = startCameFrom.get(currentStart);
        }
        path.unshift(startId);

        let tempPath = [currentGoal];
        while (currentGoal !== goalId)
        {
            currentGoal = goalCameFrom.get(currentGoal);
            tempPath.push(currentGoal);
        }

        return path.concat(tempPath);
    }
}
