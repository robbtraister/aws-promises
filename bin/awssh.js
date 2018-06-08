#!/usr/bin/env node

'use strict'

const childProcess = require('child_process')

const { ALB, EC2, ELB } = require('../lib/aws')

const users = [
  'centos',
  'ec2user',
  'ec2-user'
]

function awssh (input) {
  input = input.trim()

  const region = process.env.AWS_REGION || 'us-east-1'

  const ec2 = EC2({region})
  // try an Instance
  return ec2.describeInstance(input)
    .then(instance => {
      if (instance) {
        return instance
      }
      throw new Error('No instance found')
    })
    .catch(() => {
      // No Instance; try an ELB
      return ELB({region}).describeLoadBalancer(input)
        .then(elb => elb.Instances[0].InstanceId)
        .catch(() => {
          const alb = ALB({region})
          // No ELB; try a TG
          return alb.getTargetGroupArn(input)
            .catch(() => {
              // No TG; try an ALB
              return alb.describeListeners(input)
                .then(listeners => listeners[0].DefaultActions[0].TargetGroupArn)
            })
            .then(tgArn => alb.listTargets(tgArn))
            .then(targets => targets[0].Target.Id)
        })
        .then(instanceId => ec2.describeInstance(instanceId))
    })
    .then(instance => {
      function next () {
        const user = users.shift()
        if (user) {
          const ssh = childProcess.spawn('ssh', ['-i', `${process.env.HOME}/.pem/${instance.KeyName}.pem`, `${user}@${instance.PrivateIpAddress}`], {
            stdio: 'inherit'
          })
          ssh.on('close', (code) => {
            if (code === 255) {
              next()
            }
          })
        } else {
          throw new Error('Could not connect')
        }
      }

      next()
    })
}

if (module === require.main) {
  if (process.argv.length > 2) {
    awssh(process.argv[2]).catch(console.error)
  } else {
    console.error('Instance ID, Name, or IP Address; ELB Arn or Name; TG Arn or Name; or ALB Arn or Name is required')
  }
}
