The following scripts are available as shell commands when this package is installed globally.  All scripts that rely on AWS functions (`generate` and `set-profile` do not) use the standard mechanism for providing AWS credentials (either via `~/.aws/credentials` or environment variables).

# awssh

awssh finds and begins an ssh session into an AWS instance.  An AWS instance can be described by any of the following:

1. Private IP address
1. Public IP address
1. An instance id
1. Load Balancer name (ALB or ELB)
1. Target Group name

When multiple instances match the criteria given (e.g., and ELB with count > 1), an instance is chosen at random.

In order to complete the ssh session authentication, the pem file in `~/.pem/` directory with name matching the keypair on the instance is used.

## Usage

awssh (<ip-address> | <instance-id> | <alb-name> | <elb-name> | <tg-name>)

## Examples

`awssh i-12345678`
`awssh my-load-balancer`
`AWS_PROFILE=profile2 awssh i-12345678`


# decrypt

decrypt attempts to decrypt the provided ciphertext.  decrypt works with either a command argument or stdin, so piping is supported.

## Usage

decrypt <ciphertext>

## Examples

`decrypt AEXbdvwoiu=`
`echo AEXbdvwoiu= | decrypt`


# encrypt

encrypt attempts to encrypt the provided plaintext.  encrypt works with either a command argument or stdin, so piping is supported; this is convenient when combined with `generate`, as `generate 50:100 | encrypt`.

encrypt will use the default kms_key_id, unless one is specified.

## Usage

encrypt <plaintext> [<kms-key-id>]

## Examples

`encrypt abc-123`
`encrypt abc-123 arn:aws:kms:us-east-1:12345678:key/abc-def-ghi-jkl`
`echo abc-123 | encrypt`
`echo abc-123 | encrypt arn:aws:kms:us-east-1:12345678:key/abc-def-ghi-jkl`
`KMS_KEY_ID=arn:aws:kms:us-east-1:12345678:key/abc-def-ghi-jkl encrypt abc-123`


# generate

generate will return a crytpographically random string of characters suitable for random passwords

If `min-length` is not specified, the default is 50.  If `max-length` is not specified, the string will be exactly as long as `min-length`.

`format` may be any one of:
* base64
* hex (default)
* utf8
* binary

## Usage

generate [<min-length>[:<max-length>]] [<format>]

## Examples

`generate`
`generate 20`
`generate 20:30`
`generate base64`
`generate 20:30 utf8`
`generate 50:100 hex | encrypt arn:aws:kms:us-east-1:12345678:key/abc-def-ghi-jkl`


# set-profile

set-profile sets the default profile to be used by subsequent AWS command by modifying `~/.aws/credentials` in place; the content of the `[default]` profile is replaced with the profile given.

## Usage

set-profile <profile>

## Examples

`set-profile profile2`
