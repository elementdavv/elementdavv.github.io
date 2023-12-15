import Queue from './queue.js';

function f() {
var jobs = new Queue();
console.log("queue is" + jobs.isEmpty());
};
f();
export default f;
