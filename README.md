# 📌 Smart Campus Navigation System

![Project Status](https://img.shields.io/badge/status-completed-brightgreen)
![Language](https://img.shields.io/badge/language-javascript-blue)

> A graph-based navigation system that finds the shortest path between locations within a campus.

---

## 📖 Overview

The **Smart Campus Navigation System** is a menu-driven application that helps users navigate through a campus (or any mapped environment). It models locations as **vertices** and connections as **edges**, allowing users to compute the shortest path between two points efficiently.

This project applies fundamental concepts in **data structures and algorithms**, particularly graph theory and pathfinding.

---

## ✨ Features

* 📍 Add and manage locations (vertices)
* 🔗 Create connections between locations (edges)
* 📋 Display all locations and their connections
* 🔍 Check if two locations are connected
* 🧭 Find the shortest path between two points
* 📏 Show number of steps in the shortest path

### ⭐ Bonus Features

* ⚖️ Weighted graph support (distance-based paths)
* 🖼️ Graph visualization
* 🖥️ Simple GUI interface

---

## 🧠 Algorithms Used

| Feature                    | Algorithm                  |
| -------------------------- | -------------------------- |
| Connectivity Check         | Breadth-First Search (BFS) |
| Shortest Path (Unweighted) | BFS                        |
| Shortest Path (Weighted)   | Dijkstra’s Algorithm       |

---

## 🏗️ Project Structure

```
CS221-Smart-Campus-Navigation-System/
│── index.html
│── main.js
│── style.css
│── README.md
```

## 🚀 Getting Started

### 🔧 Installation

Clone the repository:

```bash
git clone https://github.com/prancisnof/CS221-Smart-Campus-Navigation-System.git
cd CS221-Smart-Campus-Navigation-System
```

### ▶️ Run the Program

**HTML**

```bash
index.html
```

## 🖥️ Usage

1. Launch the program
2. Choose from the menu options
3. Add locations and connections
4. Select “Find Path”
5. Input starting point and destination
6. View the result (path + no. of steps)

---

## 📸 Example Output

```
Enter starting location: Library
Enter destination: Mini Grandstand

Shortest Path:
Library → USANT Forum → Mini Grandstand

Number of steps: 35
```

---

## 📚 Concepts Applied

* Graph Data Structure
* Adjacency List / Matrix
* BFS Traversal
* Dijkstra’s Algorithm
* Algorithm Optimization

---

## 👨‍💻 Members

**1. Francis M. Roman**

**2. Crizza Bonita**

**3. Angela Dacara**
