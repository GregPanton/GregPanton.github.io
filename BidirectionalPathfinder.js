class BidirectionalPathfinder {
    constructor(nodes, edges, logUpdateFunction) {
        this.nodes = nodes;
        this.edges = edges;
        this.logUpdate = logUpdateFunction;
        this.nodeMap = new Map(nodes.map(node => [node.id, node]));
        this.adjacencyList = this.createAdjacencyList(edges);

        // Initialize the sets to keep track of visited nodes for both search directions
        this.forwardVisited = new Set();
        this.backwardVisited = new Set();
    }

    createAdjacencyList(edges) {
        const list = new Map();
        edges.forEach(edge => {
            if (!list.has(edge.source)) {
                list.set(edge.source, []);
            }
            if (!list.has(edge.target)) {
                list.set(edge.target, []);
            }
            const sourceNode = this.nodeMap.get(edge.source);
            const targetNode = this.nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) {
                console.log(`Missing node for edge: ${edge.source}, ${edge.target}`);
                return;
            }
            const distance = this.calculateDistance(sourceNode, targetNode);
            list.get(edge.source).push({ node: edge.target, cost: distance });
            list.get(edge.target).push({ node: edge.source, cost: distance });
        });
        return list;
    }

    calculateDistance(node1, node2) {
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

        return dist;
    }

    findPath(startId, endId) {
        // Initialize the distances from start and end to all nodes as Infinity
        const startDistances = new Map(this.nodes.map(node => [node.id, Infinity]));
        const endDistances = new Map(this.nodes.map(node => [node.id, Infinity]));
        startDistances.set(startId, 0);
        endDistances.set(endId, 0);

        // Initialize the sets to keep track of visited nodes from both sides
        const startVisited = new Set();
        const endVisited = new Set();

        // Maps to keep track of previous nodes to reconstruct the path later
        const startPreviousNodes = new Map();
        const endPreviousNodes = new Map();

        // Continue searching until both frontiers are empty (all possible paths are explored)
        while (startVisited.size < this.nodes.length && endVisited.size < this.nodes.length) {
            let startNode = this.expandFrontier(startVisited, startDistances, startPreviousNodes, endVisited);
            if (startNode !== null) {
                // If a node has been visited from both sides, we found a meeting point
                if (endVisited.has(startNode)) {
                    return this.reconstructPath(startPreviousNodes, startNode, endPreviousNodes);
                }
            }

            let endNode = this.expandFrontier(endVisited, endDistances, endPreviousNodes, startVisited);
            if (endNode !== null) {
                // If a node has been visited from both sides, we found a meeting point
                if (startVisited.has(endNode)) {
                    return this.reconstructPath(startPreviousNodes, endNode, endPreviousNodes);
                }
            }

            // If no new nodes were visited in this iteration from either side, stop the search
            if (startNode === null && endNode === null) {
                console.log("No path exists between the start and end nodes.");
                return [];
            }
        }

        // If the code reaches here, it means all nodes have been visited without finding a path
        console.log("All nodes have been explored, but no connecting path was found.");
        return [];
    }

    expandFrontier(frontier, cameFrom, costSoFar, adjacencyList, searchDirection) {
        let nextFrontier = new Set();
        frontier.forEach(currentNode => {
            let neighbors = adjacencyList.get(currentNode) || [];
            neighbors.forEach(neighbor => {
                // Calculate new cost to neighbor
                let newCost = costSoFar.get(currentNode) + neighbor.cost;
                // If this path to neighbor is shorter, or neighbor has not been visited
                if (!costSoFar.has(neighbor.node) || newCost < costSoFar.get(neighbor.node)) {
                    costSoFar.set(neighbor.node, newCost);
                    cameFrom.set(neighbor.node, currentNode);
                    nextFrontier.add(neighbor.node);
                    // If the search direction is 'forward', we update forwardCameFrom; if 'backward', backwardCameFrom.
                }
            });
        });

        return this.checkForMeetingNode(nextFrontier, cameFrom, searchDirection);
    }

    checkForMeetingNode(nextFrontier, cameFrom, searchDirection) {
        // Assuming there's a global or higher scoped variable that keeps track of nodes visited by the opposite search
        let oppositeVisited;
        if (searchDirection === 'forward') {
            oppositeVisited = this.backwardVisited; // This should be set somewhere in the BidirectionalPathfinder class
        } else {
            oppositeVisited = this.forwardVisited;
        }

        // Check if any node in the next frontier has been visited by the opposite search
        for (let node of nextFrontier) {
            if (oppositeVisited.has(node)) {
                return node; // Return the first meeting node found
            }
        }

        // Update the visited nodes for the current search direction
        if (searchDirection === 'forward') {
            this.forwardVisited = new Set([...this.forwardVisited, ...nextFrontier]);
        } else {
            this.backwardVisited = new Set([...this.backwardVisited, ...nextFrontier]);
        }

        return null; // No meeting node found in this expansion
    }

    reconstructPath(startPreviousNodes, meetingNode, endPreviousNodes)
    {
        const path = [];
        let currentNode = meetingNode;

        while (currentNode)
        {
            path.unshift(currentNode);
            currentNode = startPreviousNodes.get(currentNode);
        }

        currentNode = meetingNode;
        while (currentNode)
        {
            currentNode = endPreviousNodes.get(currentNode);
            if (currentNode)
            {
                path.push(currentNode);
            }
        }

        return path;
    }
}
