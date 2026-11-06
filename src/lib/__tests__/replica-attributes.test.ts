import { replicaAttributes } from '@/lib/replica-attributes';

describe('replicaAttributes', () => {
  it('names the node and the Swarm task of a replica', () => {
    expect(
      replicaAttributes({
        SWARM_NODE_HOSTNAME: 'cevi-tools-s05',
        SWARM_TASK_NAME: 'conveniat_payload.1',
      }),
    ).toStrictEqual({
      'host.name': 'cevi-tools-s05',
      'service.instance.id': 'conveniat_payload.1',
    });
  });

  it('leaves both off outside Swarm, rather than labelling every series with an empty value', () => {
    expect(replicaAttributes({})).toStrictEqual({});
    expect(replicaAttributes({ SWARM_NODE_HOSTNAME: '', SWARM_TASK_NAME: '' })).toStrictEqual({});
  });
});
