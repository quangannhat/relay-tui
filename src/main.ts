import { Effect } from "effect"
import { createInterface } from "node:readline/promises"
import { Coordination, CoordinationLive, StoreLive } from "relay-core"

const render = (repositories: ReadonlyArray<any>, tasks: ReadonlyArray<any>) => {
  console.clear()
  console.log("Relay")
  console.log("=====\n")
  console.log("REPOSITORIES")
  for (const repository of repositories) {
    console.log(`  ${repository.id}  ${repository.name}`)
  }
  console.log("\nTASKS")
  if (tasks.length === 0) console.log("  (none)")
  for (const task of tasks) {
    const owner = task.assignee ? ` @${task.assignee}` : ""
    console.log(`  ${task.id}  [${task.status.padEnd(11)}] ${task.title}${owner}`)
  }
  console.log("\n[r] refresh  [n] new task  [e] events  [d ID] details  [q] quit")
}

const program = Effect.gen(function* () {
  const relay = yield* Coordination
  const input = yield* Effect.acquireRelease(
    Effect.sync(() => createInterface({ input: process.stdin, output: process.stdout })),
    readline => Effect.sync(() => readline.close())
  )
  let running = true

  while (running) {
    render(yield* relay.listRepositories(), yield* relay.listTasks())
    const command = (yield* Effect.promise(() => input.question("> "))).trim()
    const [verb, ...args] = command.split(" ")

    if (verb === "q") {
      running = false
    } else if (verb === "r" || verb === "") {
      continue
    } else if (verb === "e") {
      const events = yield* relay.getEvents()
      console.clear()
      console.log("EVENTS\n")
      for (const event of events.slice(-30)) {
        console.log(`  #${event.id} ${event.type} ${event.taskId} @${event.actor}`)
      }
      yield* Effect.promise(() => input.question("\nPress Enter to return"))
    } else if (verb === "d" && args[0]) {
      const task = yield* relay.getTask(args[0] as any)
      console.clear()
      console.log(`${task.id}: ${task.title}\n`)
      console.log(task.description || "(no description)")
      console.log(`\nStatus: ${task.status}`)
      console.log(`Priority: ${task.priority}`)
      console.log(`Assignee: ${task.assignee ?? "(unassigned)"}`)
      console.log(`Dependencies: ${task.dependencies.join(", ") || "(none)"}`)
      console.log("\nProgress:")
      for (const update of task.progress) console.log(`  - ${update}`)
      console.log("\nArtifacts:")
      for (const artifact of task.artifacts) console.log(`  - ${artifact}`)
      yield* Effect.promise(() => input.question("\nPress Enter to return"))
    } else if (verb === "n") {
      const repositoryId = yield* Effect.promise(() => input.question("Repository ID: "))
      const title = yield* Effect.promise(() => input.question("Title: "))
      yield* relay.createTask({ repositoryId, title }, "human")
    } else {
      console.log("Unknown command")
      yield* Effect.promise(() => input.question("Press Enter to continue"))
    }
  }
})

Effect.runPromise(Effect.scoped(
  program.pipe(
    Effect.provide(CoordinationLive),
    Effect.provide(StoreLive("relay.db"))
  )
)).catch(error => {
  console.error(error)
  process.exitCode = 1
})
