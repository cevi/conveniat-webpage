/**
 * The resource attributes that say which replica this process is, so a dashboard can name it.
 *
 * Without them a replica is only its overlay IP, `10.0.23.7:9464`, which changes with every
 * deploy and says nothing about where it runs. The stack files set both variables from Swarm
 * templates: `SWARM_NODE_HOSTNAME` from `{{.Node.Hostname}}` (`cevi-tools-s05`), and
 * `SWARM_TASK_NAME` from `{{.Service.Name}}.{{.Task.Slot}}` (`conveniat_payload.1`), the name
 * `docker service ps` prints. The slot survives a deploy, so a replica keeps its series.
 *
 * A variable that is unset, as outside Swarm, leaves its attribute off.
 */
export function replicaAttributes(
  environment: Record<string, string | undefined>,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const node = environment['SWARM_NODE_HOSTNAME'];
  const task = environment['SWARM_TASK_NAME'];
  if (node !== undefined && node !== '') attributes['host.name'] = node;
  if (task !== undefined && task !== '') attributes['service.instance.id'] = task;
  return attributes;
}
