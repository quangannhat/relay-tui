import { Effect } from "effect"
import { Coordination, CoordinationLive, StoreLive } from "relay-core"

const program = Effect.gen(function* () {
  const relay = yield* Coordination
  const repositories = yield* relay.listRepositories()
  const tasks = yield* relay.listTasks()

  console.clear()
  console.log("Relay")
  console.log("=====\n")
  console.log("Repositories")
  for (const repository of repositories) {
    console.log(`  ${repository.name} (${repository.id})`)
  }
  console.log("\nTasks")
  for (const task of tasks) {
    const owner = task.assignee ? ` @${task.assignee}` : ""
    console.log(`  ${task.id} [${task.status}] ${task.title}${owner}`)
  }
  console.log("\nPhase 1 client: browse-only. Keyboard navigation and live views are next.")
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
