/********************************************************************************
 * Copyright (c) 2019 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Animation } from '../../base/animations/animation';
import { CommandExecutionContext } from '../../base/commands/command';
import { SModelRoot } from '../../base/model/smodel';
import { linear, Point } from '../../utils/geometry';
import { SRoutableElement } from '../routing/model';

export interface ResolvedEdgeMorph {
    edge: SRoutableElement
    fromRoutingPoints: Point[]
    toRoutingPoints: Point[]
    finalRoutingPoints: Point[]
}

export class EdgeMorphAnimation extends Animation {
    protected edgeMorphs: Map<string, ResolvedEdgeMorph>;

    constructor(protected model: SModelRoot,
        rawEdgeMorphs: Map<string, ResolvedEdgeMorph>,
        context: CommandExecutionContext) {
        super(context);
        this.edgeMorphs = new Map;
        rawEdgeMorphs.forEach((morph, id) => {
            if (morph.fromRoutingPoints.length > morph.toRoutingPoints.length)
                this.edgeMorphs.set(id, {...morph, ...{
                    toRoutingPoints: this.interpolateMissingPoints(morph.fromRoutingPoints, morph.toRoutingPoints)
                }});
            else if (morph.fromRoutingPoints.length < morph.toRoutingPoints.length)
                this.edgeMorphs.set(id, {...morph, ...{
                    fromRoutingPoints: this.interpolateMissingPoints(morph.toRoutingPoints, morph.fromRoutingPoints)
                }});
            else
                this.edgeMorphs.set(id, morph);
        });
    }

    tween(t: number, context: CommandExecutionContext): SModelRoot {
        this.edgeMorphs.forEach((morph, id) => {
            const edge = context.root.index.getById(id);
            if (edge instanceof SRoutableElement) {
                if (t >= 1) {
                    edge.routingPoints = morph.finalRoutingPoints;
                } else {
                    const routingPoints: Point[] = [];
                    for (let i = 1; i < morph.fromRoutingPoints.length - 1; ++i)
                        routingPoints.push(linear(morph.fromRoutingPoints[i], morph.toRoutingPoints[i], t));
                    edge.routingPoints = routingPoints;
                }
            }
        });
        return context.root;
    }

    protected interpolateMissingPoints(biggerSet: Point[], smallerSet: Point[]): Point[] {
        const result: Point[] = [];
        result.push(smallerSet[0]);
        const diff = biggerSet.length - smallerSet.length;
        const deltaDiff = 1 / (diff + 1);
        const deltaSmaller = 1 / (smallerSet.length - 1);
        let nextInsertion = 1;
        for (let i = 1; i < smallerSet.length; ++i) {
            const pos = deltaSmaller * i;
            let insertions = 0;
            while (pos > (nextInsertion + insertions) * deltaDiff)
                ++insertions;
            nextInsertion += insertions;
            for (let j = 0; j < insertions; ++j) {
                const p = linear(smallerSet[i - 1], smallerSet[i], (j + 1) / (insertions + 1));
                result.push(p);
            }
            result.push(smallerSet[i]);
        }
        return result;
    }
}
