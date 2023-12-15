---
title: "Passing Output Parameters Between Jobs in Github Actions"
date: 2023-12-12T10:00:40+01:00
description: TIL
image: /images/posts/til-github-action-output-parameters.webp
categories:
- til
tags:
- github
- devops
---

While writing the post [Convenient Neo4j Integration Tests in GitHub Actions Using the Aura CLI
](https://medium.com/neo4j/convenient-neo4j-integration-tests-in-github-actions-using-the-aura-cli-e646b2e7b018), I needed to find a way to pass the newly created database ID and credentials from one job to another.

It took a bit of hunting, but in the end I found `$GITHUB_OUTPUT`.  This references a file that you can append variables to for access in later jobs.

## Saving a value

The following job has the ID `setter` and runs on `ubuntu-latest`.

```yaml
on: workflow_dispatch

jobs:
  setter:
    runs-on: ubuntu-latest
```

As it will output a value called `new-key`, this will be defined in the `outputs`.  The `new-key` value will be set in the `set-value` step.

```yaml
    outputs:
      new-key: ${{ steps.set-value.outputs.new-key }}
```

The following step creates a random number using `$RANDOM` and appends it to `$GITHUB_OUTPUT` with a key of `new-key`, as defined above.


```yaml
    steps:
      - id: set-value
        name: Generate a value
        run: |
          value=$((RANDOM))
          echo "new-key=$value" >> "$GITHUB_OUTPUT"
```


## Accessing outputs within the same job

To access this value in the same job, you can use `${{ steps.[STEP ID].outputs.[KEY] }}`.

For example, the previous step has an id of `set-value` and the value appended to `$GITHUB_OUTPUT` is `new-key`.  So to access the value, you would use:

```yaml
      - name: Access it
        run: |
          echo "the secret number is ${{ steps.sets-value.outputs.new-key }}"
```


## Accessing outputs in another job

Grouping steps into jobs is a great way to keep your workflows organised.  You can compartmentalise workflow steps into jobs that run on different operating systems, use different languages and environments, or that run in parallel.

To access the value in another job, you will first need to define the job as a dependency of the job you want to access it in.  You can do this by adding the `needs` key to the job definition.

The ID of the job above is `setter`, so to access outputs in another job, you would add `needs: setter` to the job definition.

```yaml
jobs:
  # ...
  getter:
    runs-on: ubuntu-latest
    needs: setter
```

Then, inside a step, you can use the `${{ needs.[JOB ID].outputs.[KEY] }}` syntax to access the value.

```yaml
    steps:
      - name: Access it
        run: |
          echo "the secret number is ${{ needs.setter.outputs.new-key }}"
```

## Sensitive values

The workflow output usually detects sensitive values like passwords and API keys, but you can explicitly obscure these by [masking sensitive environment variables in the output](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#example-masking-an-environment-variable).

```yaml
    steps:
      - id: set-value
        name: Generate a value
        run: |
          value=$((RANDOM))
          echo "new-key=$value" >> "$GITHUB_OUTPUT"
        run: echo "::add-mask::$value"
```


## A working example

To view a full, working example, [check out the workflow that accompanies the original post](https://github.com/adam-cowley/aura-cli-integration-tests/blob/main/.github/workflows/aura.yml).