import math
from statistics import variance

# =========================
# ORDER CLASS
# =========================

class Order:

    def __init__(self,
                 order_id,
                 timestamp,
                 x,
                 y,
                 prep_time,
                 priority):

        self.order_id = order_id
        self.timestamp = timestamp
        self.location = (x, y)
        self.prep_time = prep_time
        self.priority = priority

        # SLA deadline
        self.sla_deadline = timestamp + prep_time + 20

        self.assigned_agent = None
        self.delivery_time = None


# =========================
# AGENT CLASS
# =========================

class Agent:

    MAX_ACTIVE_ORDERS = 2

    def __init__(self,
                 agent_id,
                 x,
                 y,
                 rating):

        self.agent_id = agent_id
        self.location = (x, y)
        self.rating = rating

        self.active_orders = []
        self.total_deliveries = 0

    def is_available(self):

        return len(self.active_orders) < 2


# =========================
# DISPATCHER CLASS
# =========================

class Dispatcher:

    def __init__(self, agents):

        self.agents = agents

        self.completed_orders = []

        self.sla_violations = 0

    # ---------------------
    # Distance
    # ---------------------

    def distance(self, loc1, loc2):

        return math.sqrt(
            (loc1[0] - loc2[0]) ** 2 +
            (loc1[1] - loc2[1]) ** 2
        )

    # ---------------------
    # Priority Weight
    # ---------------------

    def priority_weight(self, priority):

        if priority == "high":
            return 30

        elif priority == "medium":
            return 15

        return 5

    # ---------------------
    # Scoring Function
    # ---------------------

    def compute_score(self,
                      agent,
                      order,
                      current_time):

        dist = self.distance(
            agent.location,
            order.location
        )

        workload_penalty = (
            len(agent.active_orders) * 10
        )

        rating_bonus = (
            agent.rating * 5
        )

        time_left = (
            order.sla_deadline - current_time
        )

        sla_urgency = max(
            0,
            50 - time_left
        )

        priority_bonus = self.priority_weight(
            order.priority
        )

        score = (
            dist * 2
            + workload_penalty
            + sla_urgency
            - rating_bonus
            - priority_bonus
        )

        return score

    # ---------------------
    # Assign Order
    # ---------------------

    def assign_order(self,
                     order,
                     current_time):

        candidate_agents = []

        for agent in self.agents:

            if agent.is_available():

                score = self.compute_score(
                    agent,
                    order,
                    current_time
                )

                candidate_agents.append(
                    (score, agent)
                )

        if not candidate_agents:

            print("\nNo available agent "
                  f"for Order {order.order_id}")

            return

        # Best agent
        candidate_agents.sort(
            key=lambda x: x[0]
        )

        best_score, best_agent = (
            candidate_agents[0]
        )

        # Delivery calculation
        travel_time = self.distance(
            best_agent.location,
            order.location
        )

        total_delivery_time = (
            order.prep_time +
            travel_time
        )

        delivery_timestamp = (
            current_time +
            total_delivery_time
        )

        # Update order
        order.assigned_agent = (
            best_agent.agent_id
        )

        order.delivery_time = (
            total_delivery_time
        )

        # Update agent
        best_agent.active_orders.append(order)

        best_agent.location = order.location

        best_agent.total_deliveries += 1

        # SLA Check
        if delivery_timestamp > order.sla_deadline:

            self.sla_violations += 1

        self.completed_orders.append(order)

        # ---------------------
        # OUTPUT
        # ---------------------

        print("\n==========================")
        print("ORDER ASSIGNED")
        print("==========================")

        print(f"Order ID: {order.order_id}")
        print(f"Priority: {order.priority}")

        print(f"Assigned Agent:"
              f" {best_agent.agent_id}")

        print(f"Agent Rating:"
              f" {best_agent.rating}")

        print(f"Agent Location:"
              f" {best_agent.location}")

        print(f"Travel Time:"
              f" {round(travel_time, 2)}")

        print(f"Delivery Time:"
              f" {round(total_delivery_time, 2)}")

        print(f"Score:"
              f" {round(best_score, 2)}")

        print("==========================")

        # Simulate completion
        if len(best_agent.active_orders) > 0:

            best_agent.active_orders.pop(0)

    # ---------------------
    # Metrics
    # ---------------------

    def print_metrics(self):

        if not self.completed_orders:
            return

        avg_delivery = sum(
            order.delivery_time
            for order in self.completed_orders
        ) / len(self.completed_orders)

        workloads = [
            agent.total_deliveries
            for agent in self.agents
        ]

        load_variance = (
            variance(workloads)
            if len(workloads) > 1
            else 0
        )

        print("\n==========================")
        print("FINAL METRICS")
        print("==========================")

        print(f"Total Orders:"
              f" {len(self.completed_orders)}")

        print(f"Average Delivery Time:"
              f" {round(avg_delivery, 2)}")

        print(f"SLA Violations:"
              f" {self.sla_violations}")

        print(f"Load Variance:"
              f" {round(load_variance, 2)}")

        print("\nAgent Workloads:")

        for agent in self.agents:

            print(f"{agent.agent_id}"
                  f" -> "
                  f"{agent.total_deliveries}")


# =========================
# MAIN PROGRAM
# =========================

# ---------- AGENT INPUT ----------

agents = []

num_agents = int(
    input("Enter number of agents: ")
)

for i in range(num_agents):

    print(f"\nEnter details for Agent {i+1}")

    agent_id = input("Agent ID: ")

    x = float(input("Location X: "))

    y = float(input("Location Y: "))

    rating = float(input("Rating: "))

    agent = Agent(
        agent_id,
        x,
        y,
        rating
    )

    agents.append(agent)

# Create dispatcher
dispatcher = Dispatcher(agents)

# ---------- ORDER INPUT ----------

num_orders = int(
    input("\nEnter number of orders: ")
)

for i in range(num_orders):

    print(f"\nEnter details for Order {i+1}")

    order_id = input("Order ID: ")

    timestamp = int(
        input("Timestamp: ")
    )

    x = float(input("Location X: "))

    y = float(input("Location Y: "))

    prep_time = int(
        input("Prep Time: ")
    )

    priority = input(
        "Priority (low/medium/high): "
    ).lower()

    order = Order(
        order_id,
        timestamp,
        x,
        y,
        prep_time,
        priority
    )

    dispatcher.assign_order(
        order,
        timestamp
    )

# Print metrics
dispatcher.print_metrics()


































