# WebGL Limits

When the application requires too much resources (more than the system or hardware can provide) it will lose WebGL context, stopping the visualization. With a better GPU, the application usually can display more without losing context. The most limiting factor currently seems to be the number of nodes(which has a quadratic impact), and also the number of links(has a linear impact).

The event is logged by THREE.js simply as "context lost" without a stack trace, and it's not clear which piece of code caused it. But experiments show that it happens after trying to display a larger graph , or trying to use clones in a relatively large graph with many height levels. The maximum number of nodes(clones) that can be drawn depends on the system but generally is ~20k - 200k on typical clients.



