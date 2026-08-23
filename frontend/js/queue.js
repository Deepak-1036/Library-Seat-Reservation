const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "login.htm";
}

let queueRequests = JSON.parse(localStorage.getItem("queueRequests")) || [];

if (currentUser) {
    const navUserName = document.getElementById("navUserName");
    const userAvatar = document.getElementById("userAvatar");
    if (navUserName) navUserName.textContent = currentUser.name;
    if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
}

class PriorityQueue {
    constructor(items = []) {
        this.heap = items;
        this.buildHeap();
    }

    compare(a, b) {
        if (a.priority !== b.priority) return a.priority > b.priority;
        return a.createdAt < b.createdAt;
    }

    enqueue(item) {
        this.heap.push(item);
        this.heapifyUp(this.heap.length - 1);
    }

    dequeue() {
        if (this.heap.length === 0) return null;
        const highest = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.heapifyDown(0);
        }
        return highest;
    }

    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    heapifyUp(index) {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parent])) {
                this.swap(index, parent);
                index = parent;
            } else break;
        }
    }

    heapifyDown(index) {
        const length = this.heap.length;
        while (true) {
            let highest = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;

            if (left < length && this.compare(this.heap[left], this.heap[highest])) highest = left;
            if (right < length && this.compare(this.heap[right], this.heap[highest])) highest = right;

            if (highest === index) break;
            this.swap(index, highest);
            index = highest;
        }
    }

    buildHeap() {
        for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
            this.heapifyDown(i);
        }
    }

    swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }

    getSortedItems() {
        return [...this.heap].sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.createdAt - b.createdAt;
        });
    }
}

function getMyQueue() {
    return queueRequests.filter(r => r.userId === currentUser.id && r.status === "waiting");
}

function displayQueue() {
    const container = document.getElementById("queueList");
    if (!container) return;

    const myQueue = getMyQueue();
    const priorityQueue = new PriorityQueue(myQueue);
    const sorted = priorityQueue.getSortedItems();

    updateQueueStats(sorted);
    container.innerHTML = "";

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-queue">
                <div class="empty-queue-icon">⏳</div>
                <h2>Your queue is empty</h2>
                <p>You are not currently waiting for any resources.</p>
            </div>
        `;
        return;
    }

    sorted.forEach((request, index) => {
        container.innerHTML += createQueueCard(request, index + 1);
    });
}

function createQueueCard(request, position) {
    return `
        <div class="queue-card">
            <div class="queue-position">#${position}</div>
            <div class="queue-main">
                <h2>${request.resourceName}</h2>
                <p class="queue-category">${request.category}</p>
                <div class="queue-details">
                    <span>📍 ${request.location}</span>
                    <span>📅 ${request.requestedDate}</span>
                    <span>🕐 ${request.requestedTime}</span>
                </div>
            </div>
            <div class="queue-priority">
                <span class="priority-badge">Priority ${request.priority}</span>
                <div class="queue-time">${getPriorityLabel(request.priority)}</div>
                <button class="leave-queue-btn" onclick="leaveQueue(${request.id})">Leave Queue</button>
            </div>
        </div>
    `;
}

function getPriorityLabel(priority) {
    if (priority >= 3) return "High Priority";
    if (priority === 2) return "Medium Priority";
    return "Normal Priority";
}

function updateQueueStats(queue) {
    const totalEl = document.getElementById("totalQueue");
    const highestEl = document.getElementById("highestPosition");
    const servedEl = document.getElementById("servedQueue");

    if (totalEl) totalEl.textContent = queue.length;
    if (highestEl) highestEl.textContent = queue.length > 0 ? "#1" : "-";

    const servedCount = queueRequests.filter(r => r.userId === currentUser.id && r.status === "served").length;
    if (servedEl) servedEl.textContent = servedCount;
}

function leaveQueue(id) {
    const request = queueRequests.find(item => item.id === id);
    if (!request) return;

    if (request.userId !== currentUser.id) {
        alert("You can only leave your own queue requests.");
        return;
    }

    if (!confirm("Are you sure you want to leave the queue?")) return;

    queueRequests = queueRequests.filter(item => item.id !== id);
    localStorage.setItem("queueRequests", JSON.stringify(queueRequests));
    displayQueue();
}

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.htm";
}

displayQueue();