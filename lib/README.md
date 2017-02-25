# aws-promises

The aws-promises lib wraps a subset of the AWS SDK and simplifies its usage with throttled, untokenized promises.

If a request fails due to excessive activity, it is re-requested after a delay period.  If a request only returns a subset of items with a token for more, the full set of items will be collected before returning (unless a filter is provided, in which case the first match will return).

Many AWS SDK methods return an object with a single attribute of interest; in these cases, the attribute's value is returned for simplicity.

Many methods have added extra verification steps.  For example, logs.createLogGroup will verify that a log group with this name does not already exist before attempting to create a new one.  If a log group already exists, the existing group is returned instead of a new group.

Each module exposes its methods directly (e.g., aws.ecs.listClusters) using the default region, or for a specific region by function call (e.g., aws.ecs('us-east-1').listClusters).

## Usage

```js
var aws = require('aws-promises');

aws.ecs('us-east-1').listClusters().then(console.log).catch(console.error);
```

# Basic API

## acm

* describeCertificate(domainOrCertArn)
* deleteCertificate(domainOrCertArn)
* getCertificateArn(domainOrCertArn)
* listCertificates(domain)
* requestCertificate(DomainName, subdomains, ValidationDomain)

## alb

* addTags(ResourceArns, Tags)
* createListener(LoadBalancerArn, TargetGroupArn, CertificateArn)
* createLoadBalancer(Name, Subnets, SecurityGroups, Tags)
* createTargetGroup(Name, Port, VpcId, tags)
* deleteListener(ListenerArn)
* deleteLoadBalancer(loadBalancerNameOrArn)
* deleteTargetGroup(targetGroupNameOrArn)
* describeListeners(loadBalancerNameOrArn)
* describeLoadBalancer(loadBalancerNameOrArn)
* describeLoadBalancerAttributes(loadBalancerNameOrArn)
* describeLoadBalancers(LoadBalancerArns)
* describeTargetGroup(targetGroupNameOrArn)
* describeTargetGroupAttributes(targetGroupNameOrArn)
* describeTargetGroups(TargetGroupArns)
* disableCookieStickiness(TargetGroupArn)
* enableCookieStickiness(TargetGroupArn, duration)
* getLoadBalancerArn(loadBalancerName)
* getLoadBalancerName(loadBalancerArn)
* getTargetGroupArn(targetGroupName)
* getTargetGroupName(targetGroupArn)
* listTargets(targetGroupArnOrName)
* modifyLoadBalancerAttributes(LoadBalancerArn, Attributes)
* modifyTargetGroupAttributes(TargetGroupArn, Attributes)
* removeTags(ResourceArns, TagKeys)

## ec2

* describeInstance(instanceIdsOrIpsOrName)
* describeInstances(instanceIdsOrIpsOrNames)
* describeInstancesById(InstanceIds)
* describeInstancesByName(Values)
* describeInstancesByPrivateIp(Values)
* describeInstancesByPublicIp(Values)

## ecs

* describeContainers(serviceName, cluster)
* describeTaskDefinition(serviceName, cluster)
* environments(serviceName, cluster)
* getClusterArn(clusterName)
* getServiceArn(serviceName, cluster)
* getTaskDefinitionArn(serviceName, cluster)
* listClusters()
* listServices(cluster)

## elb

* addTags(LoadBalancerNames, Tags)
* deleteLoadBalancer(loadBalancerName)
* describeLoadBalancer(LoadBalancerName)
* describeLoadBalancerAttributes(LoadBalancerName)
* describeLoadBalancers(LoadBalancerNames)
* removeTags(LoadBalancerNames, Tags)

## iam

* activateAccessKey(AccessKeyId)
* createAccessKey()
* deactivateAccessKey(AccessKeyId)
* deleteAccessKey(AccessKeyId)
* listAccessKeys()

## kms

* decrypt(ciphertext, fullResponse)
* encrypt(KeyId, Plaintext)

## logs

* createLogGroup(logGroupName, retentionInDays)
* deleteLogGroup(logGroupName)
* describeLogGroup(logGroupName)
* describeLogGroups(logGroupName)
* listLogGroups()
* putRetentionPolicy(logGroupName, retentionInDays)

## route53

* createHostedZone(domain)
* createResourceRecordSet(HostedZoneId, Name, Type, loadBalancerOrRecordValues, TTL)
* deleteHostedZone(domain)
* deleteResourceRecordSet(HostedZoneId, Name, Type)
* deregisterHostedZone(domain)
* getHostedZone(domain)
* getResourceRecordSet(HostedZoneId, RecordName, RecordType)
* listResourceRecordSets(HostedZoneId)
* registerHostedZone(domain)

## s3

* getObject(Bucket, Key)
* listObjects(Bucket, Prefix)
